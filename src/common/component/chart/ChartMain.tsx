import {useEffect, useRef} from "react";
import styles from './ChartMain.module.scss'
import Candle from "./elements/Candle";
import ChartRoot from "./elements/ChartRoot";
import ChartController from "./controller/ChartController";
import XTick from "./elements/XTick";
import TimeGrid from "./elements/TimeGrid";
import Util from "../../../util/Util";
import SubController from "./controller/SubController";
import LineArea from "./elements/LineArea";
import Line from "./elements/Line";
import IVRHistory from "../../../define/IVRHistory";

const ChartMain = ({root}: { root: ChartRoot }) => {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const {current: canvas} = ref;
        if (!canvas) return;

        const wrapper = canvas.parentElement;
        if (!wrapper) return;

        // get the context for the canvas
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const chartCtrl = new ChartController(root, ctx, {log: true});

        new TimeGrid(chartCtrl, {unit: 'year'});
        new XTick(chartCtrl);
        new Candle(chartCtrl);

        const subCtrl = new SubController(chartCtrl, {log: false});

        const firstCount = Math.floor(5000 / root.data[0].close);
        const firstValue = firstCount * root.data[0].close;
        const firstPool = 5000 - firstValue;

        const firstWeek = Math.floor(Util.getWeek(root.data[0].date) / 2);
        let lastWeek = 0
        let lastVR: IVRHistory = {
            week: lastWeek,
            savedPool: 0,
            usablePool: firstPool,
            stockCount: firstCount,
            targetValue: firstValue
        }

        const vrHistory: IVRHistory[] = root.data.map((v, i) => {
            const week = Math.floor(Util.getWeek(v.date) / 2) - firstWeek;
            const marketValue = v.close * lastVR.stockCount
            if (week !== lastWeek) {
                const totalPool = lastVR.savedPool + lastVR.usablePool;
                const gradient = 10 + Math.floor(week / 26);
                const nextValue = lastVR.targetValue + totalPool / gradient + (marketValue - lastVR.targetValue) / (2 * Math.sqrt(gradient)) + 250;
                const newPool = totalPool + 250;
                const newSavedPool = newPool * Math.min(0.25 + Math.floor(week / 13) * 0.05, 0.9);
                const newUsablePool = newPool - newSavedPool;

                lastWeek = week;
                lastVR = {
                    week: lastWeek,
                    stockCount: lastVR.stockCount,
                    targetValue: nextValue,
                    savedPool: newSavedPool,
                    usablePool: newUsablePool
                }
            }

            const bandRange = 0.15;

            const ceilingValue = lastVR.targetValue * (1 + bandRange);
            const bottomValue = lastVR.targetValue * (1 - bandRange);

            if (marketValue > ceilingValue) {
                const overpriced = marketValue - ceilingValue;
                const overpriceCount = Math.floor(overpriced / v.close);
                lastVR.stockCount -= overpriceCount;
                lastVR.savedPool += overpriceCount * v.close;
            }

            if (marketValue < bottomValue) {
                const underpriced = Math.min(bottomValue - marketValue, lastVR.usablePool);
                const underpriceCount = Math.floor(underpriced / v.close);
                lastVR.stockCount += underpriceCount;
                lastVR.usablePool -= underpriceCount * v.close;
            }

            return {
                ...lastVR
            }
        })

        // 원금
        new Line(subCtrl, data => {
            const firstWeek = Math.floor(Util.getWeek(data[0].date) / 2);
            return data.map(v => {
                const week = Math.floor(Util.getWeek(v.date) / 2);
                return 5000 + (week - firstWeek) * 250;
            })
        }).setColor('black')



        // 주식
        new LineArea(subCtrl, (data) => {
            return data.map(({close}, i) => {
                const vr = vrHistory[i];
                return {top: vr.usablePool + vr.savedPool + vr.stockCount * close, bottom: vr.usablePool + vr.savedPool};
            })
        }, {bottomStroke: 'transparent'})

        // use pool
        new LineArea(subCtrl, (data) => {
            return data.map(({close}, i) => {
                const vr = vrHistory[i];
                return {top: vr.usablePool + vr.savedPool, bottom: vr.savedPool};
            })
        }, {topStroke: 'none', bottomStroke: 'none', fill: 'rgba(255,213,74,0.27)'})

        // inactive pool
        new LineArea(subCtrl, (data) => {
            return data.map(({close}, i) => {
                const vr = vrHistory[i];
                return {top: vr.savedPool};
            })
        }, {topStroke: 'none', bottomStroke: 'none', fill: 'rgba(0,150,8,0.27)'})

        // 타겟 v
        new Line(subCtrl, () => vrHistory.map(v => v.targetValue + v.usablePool + v.savedPool))
        // 밴드
        new LineArea(subCtrl, () => vrHistory.map(v => {
            const totalTarget = v.targetValue + v.usablePool + v.savedPool
            return ({top: totalTarget * 1.15, bottom: totalTarget * 0.85})
        }), {bottomStroke: 'orange', fill: 'rgba(255,203,146,0.2)', topStroke: 'orange'})

        const {refresh} = root;
        const lastResult = vrHistory.at(-1)
        console.log(lastResult && (lastResult.usablePool + lastResult.savedPool + lastResult.stockCount * (root.data.at(-1)?.close ?? 0)))

        let isMouseDown = false;

        const mouseDownHandler = (e: MouseEvent) => {
            isMouseDown = true;
            const handleChangeOffset = chartCtrl.getOffsetSetter();
            const startX = e.x;
            let movementX = 0;
            let lastX = 0;
            let isMoving = false;

            const moveDecay = () => {
                if (Math.abs(movementX) < 5) {
                    movementX = 0;
                } else {
                    movementX /= 1.2;
                }

                if (isMouseDown) {
                    requestAnimationFrame(moveDecay);
                }
            }

            moveDecay();
            const moveHandler = (e: MouseEvent) => {
                if (isMoving) {
                    return;
                }
                isMoving = true;
                const changed = handleChangeOffset(startX - e.x)
                movementX = (movementX + e.movementX);
                lastX = e.x;
                changed && refresh();
                requestAnimationFrame(() => {
                    isMoving = false;
                })
            }

            canvas.addEventListener('mousemove', moveHandler);
            window.addEventListener('mouseup', () => {
                isMouseDown = false;
                canvas.removeEventListener('mousemove', moveHandler)
                let stop = false;
                window.addEventListener('mousedown', () => {
                    stop = true;
                }, {once: true})

                const inertiaHandler = () => {
                    if (Math.abs(movementX) >= 1 && !stop) {
                        lastX += movementX
                        stop = handleChangeOffset(startX - lastX + Math.floor(movementX), true)
                        movementX += movementX > 0 ? -1 : 1;
                        refresh()
                        requestAnimationFrame(inertiaHandler)
                    }
                }
                inertiaHandler()
            }, {once: true})
        }

        const wheelHandler = (e: WheelEvent) => {
            chartCtrl.handleZoom(e.deltaY, e.x - canvas.getBoundingClientRect().left);
            refresh();
        }

        canvas.addEventListener('wheel', wheelHandler)

        canvas.addEventListener('mousedown', mouseDownHandler)

        window.addEventListener('resize', refresh);
        chartCtrl.refresh();
        return () => {
            window.removeEventListener('resize', refresh);
            canvas.removeEventListener('mousedown', mouseDownHandler)
            canvas.removeEventListener('wheel', wheelHandler)
            chartCtrl.destroy();
        }
    }, [root])


    return <div className={styles.wrapper}>
        <canvas ref={ref}/>
    </div>
}

export default ChartMain;