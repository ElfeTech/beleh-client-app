import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';

interface DatasourceContextType {
    selectedDatasourceId: string | null;
    setSelectedDatasourceId: (id: string | null) => void;
}

const DatasourceContext = createContext<DatasourceContextType | undefined>(undefined);

export { DatasourceContext };

export function DatasourceProvider({ children }: { children: ReactNode }) {
    const [selectedDatasourceId, setSelectedDatasourceId] = useState<string | null>(() => {
        // Load from localStorage on mount
        return localStorage.getItem('selectedDatasourceId');
    });

    // Persist to localStorage when it changes
    useEffect(() => {
        if (selectedDatasourceId) {
            localStorage.setItem('selectedDatasourceId', selectedDatasourceId);
        } else {
            localStorage.removeItem('selectedDatasourceId');
        }
    }, [selectedDatasourceId]);

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
