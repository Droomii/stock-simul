interface IVRSettings {
    startDate: string;
    endDate: string;
    startStock: number;
    startPool: number;
    weekCycleUnit: number;
    getCycleDeposit(week: number): number;
    getGradient(week: number): number;
    getPoolLimit(week: number): number;
}

export default IVRSettings;