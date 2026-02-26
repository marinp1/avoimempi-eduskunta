export type AdminRouteDependencies = {
  statusController: {
    invalidateCache: () => void;
  };
};
