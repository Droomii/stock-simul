import ChartElement from "./ChartElement";

class Split extends ChartElement<number | null> {
    private _stroke = 'rgba(255,0,0,0.45)';

    setColor(color: string) {
        this._stroke = color;
    }

    draw() {
        const {ctx} = this;
        ctx.strokeStyle = this._stroke;
        this.slicedData.forEach((v, i) => {
            if (v) {
                ctx.beginPath()
                ctx.moveTo((i + 1) * this.zoom - Math.floor((this.zoom / 2)), 0);
                ctx.lineTo((i + 1) * this.zoom - Math.floor((this.zoom / 2)), this.height);
                ctx.stroke();
                ctx.closePath();
                ctx.textAlign = 'left';
                ctx.fillStyle = 'red';
                ctx.fillText(`액면${v >= 1 ? '분할' : '병합'} (${Math.max(v, 1)}:${Math.max(1, Math.round(1 / v))})`, (i + 1) * this.zoom - Math.floor((this.zoom / 2)) + 4, 12)
            }
        })
    }

    get range() {
        return null;
    }
}

export default Split