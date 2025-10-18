import React from 'react';

interface SidebarProps {
  onExportWorkflow: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onExportWorkflow }) => {
  const blockGroups = [
    { 
      label: "Workflow d'Identité", 
      blocks: [
        "InformationConfirmation", 
        "IdentityChoice", 
        "IDCollection", 
        "PassportCollection", 
        "SelfieCapture", 
        "IdentityVerification", 
        "VerificationSuccess", 
        "VerificationFailed"
      ] 
    }
  ];

  return (
    <div className="w-56 border border-gray-300 rounded-md p-3 flex flex-col gap-3 bg-gray-50 overflow-y-auto h-full">
      <h3 className="font-semibold text-center mb-1">🧱 Blocs disponibles</h3>

      {/* Boutons sauvegarde */}
      <div className="flex flex-col gap-2 mb-4">
        <button
          onClick={onExportWorkflow}
          className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-1 rounded"
        >
          💾 Exporter Workflow
        </button>
      </div>

      {blockGroups.map((group) => (
        <div key={group.label}>
          <h4 className="font-medium text-sm mb-1 text-gray-700">{group.label}</h4>
          {group.blocks.map((type) => (
            <div
              key={type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("block-type", type)}
              className="p-2 mb-2 bg-gray-200 rounded-md text-center cursor-grab hover:bg-gray-300"
            >
              {type}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

