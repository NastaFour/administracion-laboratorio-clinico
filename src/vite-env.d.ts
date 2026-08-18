/// <reference types="vite/client" />

declare global {
    interface Window {
        electronAPI: {
            getPatients: () => Promise<any[]>;
            savePatient: (patient: any) => Promise<any>;
            deletePatient: (id: number) => Promise<any>;
            deleteOrder: (id: number) => Promise<any>;
            saveResults: (data: any) => Promise<any>;
            updateOrderResults: (data: { orderId: number, results: any[], observation: string }) => Promise<any>;
            updatePaymentStatus: (data: { orderId: number, status: string }) => Promise<any>;
            getHistory: () => Promise<any[]>;
            getOrderReport: (orderId: number) => Promise<any>;
            getLabConfig: () => Promise<Record<string, string>>;
            updateLabConfig: (config: Record<string, string>) => Promise<boolean>;
            getExams: () => Promise<any[]>;
            getParams: (query: { examId: number, sexo?: string }) => Promise<any[]>;
            updateExam: (data: { id: number, precio: number, muestra?: string }) => Promise<any>;
            addExam: (data: { nombre: string, categoria: string, muestra: string, precio: number }) => Promise<any>;
            deleteExam: (id: number) => Promise<any>;
            addParam: (data: {
                examId: number,
                nombre: string,
                unidad?: string,
                min?: number,
                max?: number,
                sexo?: string,
                edad_min?: number,
                edad_max?: number
            }) => Promise<any>;
            deleteParam: (id: number) => Promise<any>;
            generatePDF: (data: any) => Promise<string>;
            importData: (patients: any[]) => Promise<any>;
            runBackup: () => Promise<string>;
            exportFullBackup: () => Promise<string | null>;
            importFullBackup: (params: { mode: 'replace' | 'merge' | 'preview' }) => Promise<any>;
            seedCatalog: () => Promise<void>;
            wipeData: () => Promise<boolean>;
            quitApp: () => Promise<void>;
        };
    }
}

export { };
