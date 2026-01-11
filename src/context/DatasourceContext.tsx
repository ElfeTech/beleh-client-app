import { createContext, useState, useContext, type ReactNode } from 'react';

interface DatasourceContextType {
    selectedDatasourceId: string | null;
    setSelectedDatasourceId: (id: string | null) => void;
}

const DatasourceContext = createContext<DatasourceContextType | undefined>(undefined);

export { DatasourceContext };

export function DatasourceProvider({ children }: { children: ReactNode }) {
    const [selectedDatasourceId, setSelectedDatasourceId] = useState<string | null>(null);

    return (
        <DatasourceContext.Provider value={{ selectedDatasourceId, setSelectedDatasourceId }}>
            {children}
        </DatasourceContext.Provider>
    );
}

export function useDatasource() {
    const context = useContext(DatasourceContext);
    if (context === undefined) {
        throw new Error('useDatasource must be used within a DatasourceProvider');
    }
    return context;
}
