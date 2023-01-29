import styles from "../../../App.module.scss";
import React from "react";
import useChartContext from "../../../context/useChartContext";

const ChartSettings = () => {
    const {state: {root}, setSettings} = useChartContext();
    const handleChangeStartDate = ({currentTarget: {value}}: {currentTarget: {value: string}}) => {
        root.startDate = value;
        setSettings({})
    }

    const handleChangeEndDate = ({currentTarget: {value}}: {currentTarget: {value: string}}) => {
        root.endDate = value;
        setSettings({})
    }

    return <div className={styles.controlWrap}>
        <div>시작: <input type={'date'} onChange={handleChangeStartDate}/></div>
        <div>종료: <input type={'date'} onChange={handleChangeEndDate}/></div>
    </div>
}

export default ChartSettings;