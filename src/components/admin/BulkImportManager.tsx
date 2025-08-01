import React from 'react';
import { ManualTechniqueImporter } from "./ManualTechniqueImporter";

interface BulkImportManagerProps {
  onTechniquesImported?: (count: number) => void;
}

export const BulkImportManager: React.FC<BulkImportManagerProps> = ({ onTechniquesImported }) => {
  return <ManualTechniqueImporter onTechniquesImported={onTechniquesImported} />;
};