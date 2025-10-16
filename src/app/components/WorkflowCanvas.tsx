import React, { useRef, useEffect } from 'react';
import { useJsPlumb } from './hooks/useJsPlumb';
import { useFieldManagement } from './hooks/useFieldManagement';
import { BlockEditModal } from './BlockEditModal';
import { FieldDefinition } from './types';

interface WorkflowCanvasProps {
  onExportWorkflow: () => void;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ onExportWorkflow }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { jsPlumbInstanceRef, addEndpoints } = useJsPlumb(containerRef);
  const {
    editingBlock,
    showBlockModal,
    editingFieldIndex,
    setEditingFieldIndex,
    blockFields,
    setBlockFields,
    handleFieldClick,
    handleBlockDoubleClick,
    handleBlockModalClose,
    updateFieldProperty
  } = useFieldManagement();

  // Créer automatiquement le workflow d'identité au premier rendu
  useEffect(() => {
    if (jsPlumbInstanceRef.current && containerRef.current) {
      // Vérifier si des blocs existent déjà pour éviter la duplication
      const existingBlocks = containerRef.current.querySelectorAll('[id^="identity-"], [id^="id-"], [id^="passport-"], [id^="confirmation"], [id^="verification"], [id^="success"], [id^="failed"]');
      
      if (existingBlocks.length === 0) {
        setTimeout(() => {
          createIdentityWorkflow();
        }, 100);
      }
    }
  }, [jsPlumbInstanceRef.current]);

  const colorMap: Record<string, string> = {
    "Start": "bg-green-400",
    "End": "bg-red-400",
    "Task": "bg-blue-400",
    "Condition (IF)": "bg-orange-400",
    "Switch / Case": "bg-orange-500",
    "Input": "bg-purple-400",
    "Output": "bg-purple-500",
    "Identity Choice": "bg-cyan-400",
    "ID Collection": "bg-blue-500",
    "Passport Collection": "bg-indigo-500",
    "Information Confirmation": "bg-yellow-400",
    "Identity Verification": "bg-orange-600",
    "Verification Success": "bg-green-500",
    "Verification Failed": "bg-red-500",
  };

  // Gestion des événements
  useEffect(() => {
    const handleFieldClickEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      const fieldItem = target.closest('.field-item');
      if (fieldItem) {
        const blockElement = fieldItem.closest('[id]');
        const blockId = blockElement?.id;
        const fieldName = fieldItem.getAttribute('data-field');
        
        if (blockId && fieldName) {
          handleFieldClick(blockId, fieldName);
        }
      }
    };

    const handleBlockDoubleClickEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      const blockElement = target.closest('[id]');
      
      if (blockElement) {
        const blockId = blockElement.id;
        const blockType = blockElement.getAttribute('data-type') || 
                         blockElement.querySelector('div:first-child')?.textContent || 
                         blockElement.textContent;
        
        handleBlockDoubleClick(blockId, blockType);
      }
    };

    document.addEventListener('click', handleFieldClickEvent);
    document.addEventListener('dblclick', handleBlockDoubleClickEvent);
    
    return () => {
      document.removeEventListener('click', handleFieldClickEvent);
      document.removeEventListener('dblclick', handleBlockDoubleClickEvent);
    };
  }, [handleFieldClick, handleBlockDoubleClick]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("block-type");
    const container = containerRef.current;
    if (!container || !jsPlumbInstanceRef.current) return;

    const newId = `block-${Date.now()}`;
    const colorClass = colorMap[type] || "bg-gray-300";
    const newBlock = document.createElement("div");
    newBlock.id = newId;

    if (type === "Start" || type === "End") {
      newBlock.className = `${colorClass} absolute w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move`;
      newBlock.textContent = type;
    } else {
      newBlock.className = "absolute w-32 h-20 bg-white border border-gray-400 rounded-lg shadow-md flex flex-col overflow-hidden cursor-move";
      const header = document.createElement("div");
      header.className = `${colorClass} text-white text-xs font-semibold text-center py-1 border-b border-gray-400`;
      header.textContent = type;

      const body = document.createElement("div");
      body.className = "flex-1 flex items-center justify-center text-xs text-gray-700 bg-white px-2 text-center";
      body.textContent = "Double-clique pour éditer";

      newBlock.appendChild(header);
      newBlock.appendChild(body);
    }

    newBlock.style.top = `${e.nativeEvent.offsetY}px`;
    newBlock.style.left = `${e.nativeEvent.offsetX}px`;

    container.appendChild(newBlock);
    jsPlumbInstanceRef.current.manage(newBlock);
    addEndpoints(jsPlumbInstanceRef.current, newBlock);

    // Initialiser les champs pour les blocs de collecte
    if (type === "ID Collection" || type === "Passport Collection") {
      const defaultFields: FieldDefinition[] = [
        {
          name: "nom",
          label: "Nom",
          field_type: "text",
          is_required: true,
          is_multiple: false,
          order: 0,
          depends_on: ""
        },
        {
          name: "prenom",
          label: "Prénom",
          field_type: "text",
          is_required: true,
          is_multiple: false,
          order: 1,
          depends_on: ""
        },
        {
          name: type === "ID Collection" ? "numero_id" : "numero_passeport",
          label: type === "ID Collection" ? "Numéro ID" : "Numéro Passeport",
          field_type: "text",
          is_required: true,
          is_multiple: false,
          order: 2,
          depends_on: ""
        }
      ];
      
      setBlockFields(prev => ({
        ...prev,
        [newId]: defaultFields
      }));
    }
  };

  const clearExistingWorkflow = () => {
    if (!containerRef.current || !jsPlumbInstanceRef.current) return;
    
    const container = containerRef.current;
    const instance = jsPlumbInstanceRef.current;
    
    // Supprimer tous les blocs existants du workflow d'identité
    const existingBlocks = container.querySelectorAll('[id^="identity-"], [id^="id-"], [id^="passport-"], [id^="confirmation"], [id^="verification"], [id^="success"], [id^="failed"]');
    existingBlocks.forEach(block => {
      // Détacher toutes les connexions du bloc
      instance.removeAllEndpoints(block);
      // Supprimer le bloc du DOM
      block.remove();
    });
  };

  const createIdentityWorkflow = () => {
    if (!containerRef.current || !jsPlumbInstanceRef.current) return;

    // Nettoyer d'abord les blocs existants
    clearExistingWorkflow();

    const container = containerRef.current;
    const instance = jsPlumbInstanceRef.current;

    const positions = {
      choice: { top: 150, left: 30 },
      idCollection: { top: 80, left: 280 },
      passportCollection: { top: 220, left: 280 },
      confirmation: { top: 150, left: 500 },
      verification: { top: 150, left: 720 },
      success: { top: 80, left: 940 },
      failed: { top: 220, left: 940 }
    };

    const blocks = [
      { id: "identity-choice", type: "Identity Choice", pos: positions.choice },
      { id: "id-collection", type: "ID Collection", pos: positions.idCollection },
      { id: "passport-collection", type: "Passport Collection", pos: positions.passportCollection },
      { id: "confirmation", type: "Information Confirmation", pos: positions.confirmation },
      { id: "verification", type: "Identity Verification", pos: positions.verification },
      { id: "success", type: "Verification Success", pos: positions.success },
      { id: "failed", type: "Verification Failed", pos: positions.failed }
    ];

    // Créer chaque bloc
    blocks.forEach(block => {
      const element = document.createElement("div");
      element.id = block.id;
      
      const colorClass = colorMap[block.type];
      const isCollectionBlock = block.type === "ID Collection" || block.type === "Passport Collection";
      const blockSize = isCollectionBlock ? "w-36 h-24" : "w-32 h-20";
      element.className = `absolute ${blockSize} bg-white border border-gray-400 rounded-lg shadow-md flex flex-col overflow-hidden cursor-move`;
      
      const header = document.createElement("div");
      header.className = `${colorClass} text-white text-xs font-semibold text-center py-1 border-b border-gray-400`;
      header.textContent = block.type;

      const body = document.createElement("div");
      body.className = "flex-1 flex items-center justify-center text-xs text-gray-700 bg-white px-2 text-center";
      
      // Contenu spécifique selon le type
      switch(block.type) {
        case "Identity Choice":
          body.textContent = "Choisir: ID ou Passeport";
          break;
        case "ID Collection":
          body.innerHTML = `
            <div class="text-center">
              <div class="font-semibold mb-1">Collecter:</div>
              <div class="text-xs text-gray-500">Double-clique pour configurer</div>
            </div>
          `;
          break;
        case "Passport Collection":
          body.innerHTML = `
            <div class="text-center">
              <div class="font-semibold mb-1">Collecter:</div>
              <div class="text-xs text-gray-500">Double-clique pour configurer</div>
            </div>
          `;
          break;
        case "Information Confirmation":
          body.textContent = "Confirmer les informations saisies";
          break;
        case "Identity Verification":
          body.textContent = "Vérifier l'identité";
          break;
        case "Verification Success":
          body.textContent = "✅ Identité vérifiée";
          break;
        case "Verification Failed":
          body.textContent = "❌ Échec de vérification";
          break;
        default:
          body.textContent = "Double-clique pour éditer";
      }

      element.appendChild(header);
      element.appendChild(body);

      element.style.top = `${block.pos.top}px`;
      element.style.left = `${block.pos.left}px`;

      container.appendChild(element);
      instance.manage(element);
      addEndpoints(instance, element);
    });

    // Créer les connexions
    setTimeout(() => {
      const choiceEl = document.getElementById("identity-choice");
      const idCollectionEl = document.getElementById("id-collection");
      const passportCollectionEl = document.getElementById("passport-collection");
      const confirmationEl = document.getElementById("confirmation");
      const verificationEl = document.getElementById("verification");
      const successEl = document.getElementById("success");
      const failedEl = document.getElementById("failed");

      if (choiceEl && idCollectionEl) instance.connect({ 
        source: choiceEl, 
        target: idCollectionEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "IF: ID choisi",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-1",
              labelOffset: { x: 8, y: -20 }
            }
          }
        ]
      });
      if (choiceEl && passportCollectionEl) instance.connect({ 
        source: choiceEl, 
        target: passportCollectionEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "IF: Passeport choisi",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-2",
              labelOffset: { x: 8, y: -20 }
            }
          }
        ]
      });
      if (idCollectionEl && confirmationEl) instance.connect({ 
        source: idCollectionEl, 
        target: confirmationEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "→ Données ID collectées",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-3",
              labelOffset: { x: 8, y: -20 }
            }
          }
        ]
      });
      if (passportCollectionEl && confirmationEl) instance.connect({ 
        source: passportCollectionEl, 
        target: confirmationEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "→ Données Passeport collectées",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-4",
              labelOffset: { x: 8, y: -20 }
            }
          }
        ]
      });
      if (confirmationEl && verificationEl) instance.connect({ 
        source: confirmationEl, 
        target: verificationEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "→ Confirmation OK",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-5",
              labelOffset: { x: 8, y: -20 }
            }
          }
        ]
      });
      if (verificationEl && successEl) instance.connect({ 
        source: verificationEl, 
        target: successEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#22C55E", strokeWidth: 2 },
        endpointStyle: { fill: "#22C55E", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "IF: Vérification réussie",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-6",
              labelOffset: { x: 8, y: -20 }
            }
          }
        ]
      });
      if (verificationEl && failedEl) instance.connect({ 
        source: verificationEl, 
        target: failedEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#EF4444", strokeWidth: 2 },
        endpointStyle: { fill: "#EF4444", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "IF: Vérification échouée",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-7",
              labelOffset: { x: 8, y: -20 }
            }
          }
        ]
      });
    }, 100);

    // Initialiser les champs pour les blocs de collecte
    const idCollectionFields: FieldDefinition[] = [
      {
        name: "nom",
        label: "Nom",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 0,
        depends_on: ""
      },
      {
        name: "prenom",
        label: "Prénom",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 1,
        depends_on: ""
      },
      {
        name: "numero_id",
        label: "Numéro ID",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 2,
        depends_on: ""
      }
    ];

    const passportCollectionFields: FieldDefinition[] = [
      {
        name: "nom",
        label: "Nom",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 0,
        depends_on: ""
      },
      {
        name: "prenom",
        label: "Prénom",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 1,
        depends_on: ""
      },
      {
        name: "numero_passeport",
        label: "Numéro Passeport",
        field_type: "text",
        is_required: true,
        is_multiple: false,
        order: 2,
        depends_on: ""
      }
    ];

    setBlockFields(prev => ({
      ...prev,
      "id-collection": idCollectionFields,
      "passport-collection": passportCollectionFields
    }));
  };

  const syncFieldDisplay = (blockId: string, forceUpdate = false) => {
    const block = document.getElementById(blockId);
    if (!block || !blockFields[blockId]) return;

    const sortedFields = [...blockFields[blockId]].sort((a, b) => a.order - b.order);
    const fieldItems = block.querySelectorAll('.field-item');
    
    let needsUpdate = forceUpdate;
    if (!needsUpdate) {
      fieldItems.forEach((fieldItem, index) => {
        const currentText = fieldItem.textContent;
        const expectedText = sortedFields[index] ? `• ${sortedFields[index].label}` : '';
        if (currentText !== expectedText) {
          needsUpdate = true;
        }
      });
    }
    
    if (needsUpdate) {
      fieldItems.forEach((fieldItem, index) => {
        if (sortedFields[index]) {
          const field = sortedFields[index];
          fieldItem.textContent = `• ${field.label}`;
          fieldItem.setAttribute('data-field', field.name);
        }
      });
    }
  };

  // Fonction pour réinitialiser le workflow (utile pour le débogage)
  const resetWorkflow = () => {
    clearExistingWorkflow();
    setBlockFields({});
    setTimeout(() => {
      createIdentityWorkflow();
    }, 100);
  };

  return (
    <>
      <div
        ref={containerRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative flex-1 border border-gray-300 rounded-md bg-white"
      >
        {/* Zone vide - l'utilisateur peut glisser-déposer des blocs depuis le menu latéral */}
      </div>
      
      <BlockEditModal
        showModal={showBlockModal}
        editingBlock={editingBlock}
        blockFields={blockFields}
        editingFieldIndex={editingFieldIndex}
        setEditingFieldIndex={setEditingFieldIndex}
        updateFieldProperty={updateFieldProperty}
        setBlockFields={setBlockFields}
        onClose={handleBlockModalClose}
        syncFieldDisplay={syncFieldDisplay}
      />
    </>
  );
};
