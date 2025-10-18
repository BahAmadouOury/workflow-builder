"use client";
import React, { useRef, useEffect, useState } from 'react';
import { newInstance, BrowserJsPlumbInstance } from '@jsplumb/browser-ui';
import { Sidebar } from './Sidebar';
import { WorkflowCanvas } from './WorkflowCanvas';
import { FieldDefinition } from './types';

export default function 
WorkflowEditorRefactored() {
  const containerRef = useRef<HTMLDivElement>(null);
  const jsPlumbInstanceRef = useRef<BrowserJsPlumbInstance | null>(null);
  const [blockFields, setBlockFields] = useState<Record<string, FieldDefinition[]>>({});
  
  // Initialiser les champs pour les blocs de collecte
  useEffect(() => {
    console.log('Parent - Initializing blockFields...');
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

    setBlockFields(prev => {
      const newFields = {
        ...prev,
        "id-collection": idCollectionFields,
        "passport-collection": passportCollectionFields
      };
      console.log('Parent - Setting block fields - prev:', prev);
      console.log('Parent - Setting block fields - new:', newFields);
      return newFields;
    });
  }, []);

  // Initialisation jsPlumb
  useEffect(() => {
    if (!containerRef.current) return;

    const instance = newInstance({
      container: containerRef.current,
      paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
      endpointStyle: { fill: "#4A90E2", radius: 4 },
      connector: { type: "StateMachine", options: {} },
    });

    jsPlumbInstanceRef.current = instance;

    // Créer automatiquement le workflow d'identité au premier rendu
    setTimeout(() => {
      createIdentityWorkflow();
    }, 100);

    return () => instance.destroy();
  }, []);

  const createIdentityWorkflow = () => {
    if (!containerRef.current || !jsPlumbInstanceRef.current) return;

    const container = containerRef.current;
    const instance = jsPlumbInstanceRef.current;

    const positions = {
      choice: { top: 200, left: 50 },
      idCollection: { top: 100, left: 300 },
      passportCollection: { top: 300, left: 300 },
      confirmation: { top: 200, left: 550 },
      verification: { top: 200, left: 750 },
      success: { top: 100, left: 950 },
      failed: { top: 300, left: 950 }
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

    const colorMap: Record<string, string> = {
      "Identity Choice": "bg-cyan-400",
      "ID Collection": "bg-blue-500",
      "Passport Collection": "bg-indigo-500",
      "Information Confirmation": "bg-yellow-400",
      "Identity Verification": "bg-orange-600",
      "Verification Success": "bg-green-500",
      "Verification Failed": "bg-red-500",
    };

    // Créer chaque bloc
    blocks.forEach(block => {
      const element = document.createElement("div");
      element.id = block.id;
      
      const colorClass = colorMap[block.type];
      const isCollectionBlock = block.type === "ID Collection" || block.type === "Passport Collection";
      const blockSize = isCollectionBlock ? "w-48 h-32" : "w-44 h-28";
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
      instance.addEndpoint(element, { anchor: "Right", endpoint: "Dot", source: true });
      instance.addEndpoint(element, { anchor: "Left", endpoint: "Dot", target: true });
      instance.setDraggable(element, true);
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
        endpointStyle: { fill: "#4A90E2", radius: 4 }
      });
      if (choiceEl && passportCollectionEl) instance.connect({ 
        source: choiceEl, 
        target: passportCollectionEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 }
      });
      if (idCollectionEl && confirmationEl) instance.connect({ 
        source: idCollectionEl, 
        target: confirmationEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 }
      });
      if (passportCollectionEl && confirmationEl) instance.connect({ 
        source: passportCollectionEl, 
        target: confirmationEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 }
      });
      if (confirmationEl && verificationEl) instance.connect({ 
        source: confirmationEl, 
        target: verificationEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 }
      });
      if (verificationEl && successEl) instance.connect({ 
        source: verificationEl, 
        target: successEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 }
      });
      if (verificationEl && failedEl) instance.connect({ 
        source: verificationEl, 
        target: failedEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 }
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

  const exportWorkflow = () => {
    // Utiliser la fonction d'export du WorkflowCanvas
    if ((window as any).exportWorkflow) {
      (window as any).exportWorkflow();
    } else {
      console.log("⚠️ Fonction d'export non disponible");
    }
  };

  console.log('Parent - Rendering with blockFields:', blockFields);
  console.log('Parent - blockFields keys:', Object.keys(blockFields));
  
  return (
    <div className="w-screen h-screen flex gap-4">
      <Sidebar onExportWorkflow={exportWorkflow} />
      <WorkflowCanvas 
        onExportWorkflow={exportWorkflow} 
        blockFields={blockFields}
        setBlockFields={setBlockFields}
      />
      
   
    </div>
  );
}

