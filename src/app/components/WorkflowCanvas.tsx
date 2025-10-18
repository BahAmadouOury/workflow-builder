import React, { useRef, useEffect } from 'react';
import { useJsPlumb } from './hooks/useJsPlumb';
import { useFieldManagement } from './hooks/useFieldManagement';
import { BlockEditModal } from './BlockEditModal';
import { FieldDefinition } from './types';

interface WorkflowCanvasProps {
  onExportWorkflow: () => void;
  blockFields: Record<string, FieldDefinition[]>;
  setBlockFields: React.Dispatch<React.SetStateAction<Record<string, FieldDefinition[]>>>;
}

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ onExportWorkflow, blockFields, setBlockFields }) => {
  console.log('WorkflowCanvas - Received blockFields:', blockFields);
  console.log('WorkflowCanvas - blockFields keys:', Object.keys(blockFields));
  console.log('WorkflowCanvas - id-collection fields:', blockFields['id-collection']);
  console.log('WorkflowCanvas - passport-collection fields:', blockFields['passport-collection']);
  const containerRef = useRef<HTMLDivElement>(null);
  const { jsPlumbInstanceRef, addEndpoints } = useJsPlumb(containerRef);
  const {
    editingBlock,
    showBlockModal,
    editingFieldIndex,
    setEditingFieldIndex,
    handleFieldClick,
    handleBlockDoubleClick,
    handleBlockModalClose,
    updateFieldProperty
  } = useFieldManagement();

  // Créer automatiquement le workflow d'identité au premier rendu
  useEffect(() => {
    if (jsPlumbInstanceRef.current && containerRef.current) {
      // Vérifier si des blocs existent déjà pour éviter la duplication
      const existingBlocks = containerRef.current.querySelectorAll('[id^="intro"], [id^="identity-choice"], [id^="id-collection"], [id^="passport-collection"], [id^="image-review"], [id^="selfie-capture"], [id^="selfie-review"], [id^="identity-verification"], [id^="success"], [id^="failed"]');
      
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
    "InformationConfirmation": "bg-yellow-400",
    "IdentityChoice": "bg-cyan-400",
    "IDCollection": "bg-blue-500",
    "PassportCollection": "bg-indigo-500",
    "SelfieCapture": "bg-purple-500",
    "IdentityVerification": "bg-orange-600",
    "VerificationSuccess": "bg-green-500",
    "VerificationFailed": "bg-red-500",
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
    if (type === "IDCollection" || type === "PassportCollection") {
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
          name: type === "IDCollection" ? "numero_id" : "numero_passeport",
          label: type === "IDCollection" ? "Numéro ID" : "Numéro Passeport",
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
    const existingBlocks = container.querySelectorAll('[id^="intro"], [id^="identity-choice"], [id^="id-collection"], [id^="passport-collection"], [id^="image-review"], [id^="selfie-capture"], [id^="selfie-review"], [id^="identity-verification"], [id^="success"], [id^="failed"]');
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
      intro: { top: 150, left: 20 },
      identityChoice: { top: 150, left: 180 },
      idCollection: { top: 80, left: 340 },
      passportCollection: { top: 220, left: 340 },
      imageReview: { top: 150, left: 500 },
      selfieCapture: { top: 150, left: 660 },
      selfieReview: { top: 150, left: 820 },
      identityVerification: { top: 150, left: 980 },
      success: { top: 80, left: 1140 },
      failed: { top: 220, left: 1140 }
    };

    const blocks = [
      { id: "intro", type: "InformationConfirmation", pos: positions.intro },
      { id: "identity-choice", type: "IdentityChoice", pos: positions.identityChoice },
      { id: "id-collection", type: "IDCollection", pos: positions.idCollection },
      { id: "passport-collection", type: "PassportCollection", pos: positions.passportCollection },
      { id: "image-review", type: "InformationConfirmation", pos: positions.imageReview },
      { id: "selfie-capture", type: "SelfieCapture", pos: positions.selfieCapture },
      { id: "selfie-review", type: "InformationConfirmation", pos: positions.selfieReview },
      { id: "identity-verification", type: "IdentityVerification", pos: positions.identityVerification },
      { id: "success", type: "VerificationSuccess", pos: positions.success },
      { id: "failed", type: "VerificationFailed", pos: positions.failed }
    ];

    // Créer chaque bloc
    blocks.forEach(block => {
      const element = document.createElement("div");
      element.id = block.id;
      
      const colorClass = colorMap[block.type];
      const isCollectionBlock = block.type === "IDCollection" || block.type === "PassportCollection";
      const blockSize = isCollectionBlock ? "w-32 h-20" : "w-28 h-16";
      element.className = `absolute ${blockSize} bg-white border border-gray-400 rounded-lg shadow-md flex flex-col overflow-hidden cursor-move`;
      
      const header = document.createElement("div");
      header.className = `${colorClass} text-white text-xs font-semibold text-center py-1 border-b border-gray-400`;
      header.textContent = block.type;

      const body = document.createElement("div");
      body.className = "flex-1 flex items-center justify-center text-xs text-gray-700 bg-white px-1 text-center";
      
      // Contenu spécifique selon le type et l'ID
      if (block.id === "intro") {
        body.textContent = "Introduction";
      } else if (block.id === "identity-choice") {
        body.textContent = "Choisir document";
      } else if (block.id === "id-collection") {
        body.innerHTML = `
          <div class="text-center">
            <div class="font-semibold mb-1 text-xs">Collecter:</div>
            <div class="text-xs text-gray-500">Double-clique</div>
          </div>
        `;
      } else if (block.id === "passport-collection") {
        body.innerHTML = `
          <div class="text-center">
            <div class="font-semibold mb-1 text-xs">Collecter:</div>
            <div class="text-xs text-gray-500">Double-clique</div>
          </div>
        `;
      } else if (block.id === "image-review") {
        body.textContent = "Revue image";
      } else if (block.id === "selfie-capture") {
        body.textContent = "Selfie";
      } else if (block.id === "selfie-review") {
        body.textContent = "Vérif selfie";
      } else if (block.id === "identity-verification") {
        body.textContent = "Vérification";
      } else if (block.id === "success") {
        body.textContent = "✅ Succès";
      } else if (block.id === "failed") {
        body.textContent = "❌ Échec";
      } else {
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
      const introEl = document.getElementById("intro");
      const identityChoiceEl = document.getElementById("identity-choice");
      const idCollectionEl = document.getElementById("id-collection");
      const passportCollectionEl = document.getElementById("passport-collection");
      const imageReviewEl = document.getElementById("image-review");
      const selfieCaptureEl = document.getElementById("selfie-capture");
      const selfieReviewEl = document.getElementById("selfie-review");
      const identityVerificationEl = document.getElementById("identity-verification");
      const successEl = document.getElementById("success");
      const failedEl = document.getElementById("failed");

      // Connexions selon le flowchart
      if (introEl && identityChoiceEl) instance.connect({ 
        source: introEl, 
        target: identityChoiceEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "→ Début",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-1",
              labelOffset: { x: 0, y: -30 }
            }
          }
        ]
      });
      
      if (identityChoiceEl && idCollectionEl) instance.connect({ 
        source: identityChoiceEl, 
        target: idCollectionEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "CNI/Permis/Électorale",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-2",
              labelOffset: { x: 0, y: -30 }
            }
          }
        ]
      });
      
      if (identityChoiceEl && passportCollectionEl) instance.connect({ 
        source: identityChoiceEl, 
        target: passportCollectionEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "Passeport",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-3",
              labelOffset: { x: 0, y: -30 }
            }
          }
        ]
      });
      
      if (idCollectionEl && imageReviewEl) instance.connect({ 
        source: idCollectionEl, 
        target: imageReviewEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "→ Document capturé",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-4",
              labelOffset: { x: 0, y: -30 }
            }
          }
        ]
      });
      
      if (passportCollectionEl && imageReviewEl) instance.connect({ 
        source: passportCollectionEl, 
        target: imageReviewEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "→ Passeport capturé",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-5",
              labelOffset: { x: 0, y: -30 }
            }
          }
        ]
      });
      
      if (imageReviewEl && selfieCaptureEl) instance.connect({ 
        source: imageReviewEl, 
        target: selfieCaptureEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "Confirmé",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-6",
              labelOffset: { x: 0, y: -30 }
            }
          }
        ]
      });
      
      if (selfieCaptureEl && selfieReviewEl) instance.connect({ 
        source: selfieCaptureEl, 
        target: selfieReviewEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "→ Selfie capturé",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-7",
              labelOffset: { x: 0, y: -30 }
            }
          }
        ]
      });
      
      if (selfieReviewEl && identityVerificationEl) instance.connect({ 
        source: selfieReviewEl, 
        target: identityVerificationEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "Confirmé",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-8",
              labelOffset: { x: 0, y: -30 }
            }
          }
        ]
      });
      
      if (identityVerificationEl && successEl) instance.connect({ 
        source: identityVerificationEl, 
        target: successEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#22C55E", strokeWidth: 2 },
        endpointStyle: { fill: "#22C55E", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "OK",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-9",
              labelOffset: { x: 0, y: -30 }
            }
          }
        ]
      });
      
      if (identityVerificationEl && failedEl) instance.connect({ 
        source: identityVerificationEl, 
        target: failedEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#EF4444", strokeWidth: 2 },
        endpointStyle: { fill: "#EF4444", radius: 4 },
        overlays: [
          {
            type: "Label",
            options: { 
              label: "KO",
              cssClass: "connection-label",
              location: 0.5,
              id: "label-10",
              labelOffset: { x: 0, y: -30 }
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

    // Les champs sont maintenant gérés par le composant parent
    // On ne les initialise plus ici
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

  const exportWorkflow = () => {
    if (!containerRef.current || !jsPlumbInstanceRef.current) return;

    const container = containerRef.current;
    const instance = jsPlumbInstanceRef.current;
    
    console.log('Export - Current blockFields:', blockFields);
    console.log('Export - blockFields keys:', Object.keys(blockFields));
    console.log('Export - id-collection fields:', blockFields['id-collection']);
    console.log('Export - passport-collection fields:', blockFields['passport-collection']);
    
    // Forcer la récupération des champs depuis l'état local
    const currentBlockFields = blockFields;
    
    // Récupérer tous les blocs
    const blocks = Array.from(container.querySelectorAll('[id]')).map(block => {
      const element = block as HTMLElement;
      const rect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Récupérer les champs pour ce bloc
      const blockId = element.id;
      const fields = currentBlockFields[blockId] || [];
      
      // Debug pour chaque bloc
      if (blockId === 'id-collection' || blockId === 'passport-collection') {
        console.log(`Debug ${blockId}:`, {
          blockId,
          fields,
          currentBlockFieldsKeys: Object.keys(currentBlockFields),
          hasFields: currentBlockFields[blockId] ? 'YES' : 'NO',
          fieldsLength: fields.length
        });
      }
      
      return {
        id: element.id,
        type: element.querySelector('div:first-child')?.textContent || 'Unknown',
        position: {
          x: rect.left - containerRect.left,
          y: rect.top - containerRect.top
        },
        size: {
          width: rect.width,
          height: rect.height
        },
        fields: fields
      };
    });

    // Récupérer toutes les connexions
    const connections = Object.values(instance.getConnections()).map((conn: any) => ({
      source: conn.sourceId,
      target: conn.targetId,
      label: conn.getOverlay('label')?.getLabel() || ''
    }));

    const workflowData = {
      metadata: {
        name: "Workflow d'Identité",
        version: "1.0.0",
        createdAt: new Date().toISOString(),
        description: "Workflow de vérification d'identité avec collecte de documents"
      },
      blocks,
      connections,
      settings: {
        canvasSize: {
          width: container.scrollWidth,
          height: container.scrollHeight
        }
      }
    };

    console.log('=== EXPORT WORKFLOW ===');
    console.log('BlockFields state:', blockFields);
    console.log('Available block IDs:', Object.keys(blockFields));
    console.log('Blocks found:', blocks.map(b => ({ id: b.id, type: b.type, fieldsCount: b.fields.length })));
    console.log('Workflow data:', JSON.stringify(workflowData, null, 2));
    console.log('======================');
    
    return workflowData;
  };

  // Fonction pour réinitialiser le workflow (utile pour le débogage)
  const resetWorkflow = () => {
    clearExistingWorkflow();
    setBlockFields({});
    setTimeout(() => {
      createIdentityWorkflow();
    }, 100);
  };

  // Connecter la fonction d'export
  useEffect(() => {
    (window as any).exportWorkflow = exportWorkflow;
  }, []);

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
