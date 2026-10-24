export type EmployeesViewModel = {
    renewalDaysBeforeExpiry: number;
    totalCount: number;
    withProblemsCount: number;
    employees: EmployeeRowViewModel[];
}

export type EmployeeRowViewModel = {
    id: string;
    name: string;
    department: string | null;
    position: string;
    statusLabelKey: string;
    isActive: boolean;
    missingCount: number;
    expiredCount: number;
    expiringCount: number;
    highlight: "danger" | "warning" | null;
}
