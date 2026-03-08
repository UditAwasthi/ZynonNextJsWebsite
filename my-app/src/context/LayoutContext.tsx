"use client";

import React, { createContext, useContext, useState } from "react";

const LayoutContext = createContext({
  isCollapsed: false,
  setIsCollapsed: (val: boolean) => {},
});

export const LayoutProvider = ({ children }: { children: React.ReactNode }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <LayoutContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => useContext(LayoutContext);