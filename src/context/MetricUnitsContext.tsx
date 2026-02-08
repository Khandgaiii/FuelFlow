import React, { createContext, useContext, useState } from 'react';

interface MetricUnitsContextType {
  metricUnits: boolean;
  setMetricUnits: (value: boolean) => void;
  toggleMetricUnits: () => void;
}

const MetricUnitsContext = createContext<MetricUnitsContextType | undefined>(undefined);

export const MetricUnitsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [metricUnits, setMetricUnits] = useState(true);

  const toggleMetricUnits = () => {
    setMetricUnits(!metricUnits);
  };

  return (
    <MetricUnitsContext.Provider value={{ metricUnits, setMetricUnits, toggleMetricUnits }}>
      {children}
    </MetricUnitsContext.Provider>
  );
};

export const useMetricUnits = (): MetricUnitsContextType => {
  const context = useContext(MetricUnitsContext);
  if (!context) {
    throw new Error('useMetricUnits must be used within MetricUnitsProvider');
  }
  return context;
};
