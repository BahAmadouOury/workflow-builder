"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { newInstance, BrowserJsPlumbInstance } from "@jsplumb/browser-ui";

interface FieldDefinition {
  name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  is_multiple: boolean;
  order: number;
  depends_on: string;
}

export default function WorkflowEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const jsPlumbInstanceRef = useRef<BrowserJsPlumbInstance | null>(null);
  const blockCounter = useRef(2);
  const [editingField, setEditingField] = useState<{blockId: string, fieldName: string} | null>(null);
  const [editingBlock, setEditingBlock] = useState<{blockId: string, blockType: string} | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldData, setFieldData] = useState<Record<string, Record<string, string>>>({});
  const [blockFields, setBlockFields] = useState<Record<string, FieldDefinition[]>>({});

  const colorMap: Record<string, string> = {
    "Start": "bg-green-400",
    "End": "bg-red-400",
    "Task": "bg-blue-400",
    "Condition (IF)": "bg-orange-400",
    "Switch / Case": "bg-orange-500",
    "Input": "bg-purple-400",
    "Output": "bg-purple-500",
    // Workflow de vérification d'identité
    "Identity Choice": "bg-cyan-400",
    "ID Collection": "bg-blue-500",
    "Passport Collection": "bg-indigo-500",
    "Information Confirmation": "bg-yellow-400",
    "Identity Verification": "bg-orange-600",
    "Verification Success": "bg-green-500",
    "Verification Failed": "bg-red-500",
  };

  // ----------------------- INIT JSPLUMB -----------------------
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

  // ----------------------- GESTION DES ÉVÉNEMENTS DE CHAMPS -----------------------
  useEffect(() => {
    const handleFieldClickEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      const fieldItem = target.closest('.field-item');
      if (fieldItem) {
        // Chercher le bloc parent avec n'importe quel ID
        const blockElement = fieldItem.closest('[id]');
        const blockId = blockElement?.id;
        const fieldName = fieldItem.getAttribute('data-field');
        
        console.log('Field clicked:', { blockId, fieldName, fieldItem }); // Debug
        console.log('Target element:', target); // Debug
        console.log('Field item found:', fieldItem); // Debug
        
        if (blockId && fieldName) {
          console.log('Calling handleFieldClick with:', { blockId, fieldName }); // Debug
          handleFieldClick(blockId, fieldName);
        } else {
          console.log('Missing blockId or fieldName:', { blockId, fieldName }); // Debug
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
        
        console.log('Block double-clicked:', { blockId, blockType }); // Debug
        
        // Vérifier si c'est un bloc de collecte (ID Collection ou Passport Collection)
        if (blockType === "ID Collection" || blockType === "Passport Collection") {
          // Ouvrir la modale de bloc
          setEditingBlock({ blockId, blockType });
          setShowBlockModal(true);
        } else {
          console.log('Block type not supported for field editing:', blockType);
        }
      }
    };

    const handleKeyDownEvent = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.contentEditable === 'true') {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          target.contentEditable = 'false';
          target.blur();
        }
      }
    };

    document.addEventListener('click', handleFieldClickEvent);
    document.addEventListener('dblclick', handleBlockDoubleClickEvent);
    document.addEventListener('keydown', handleKeyDownEvent);
    return () => {
      document.removeEventListener('click', handleFieldClickEvent);
      document.removeEventListener('dblclick', handleBlockDoubleClickEvent);
      document.removeEventListener('keydown', handleKeyDownEvent);
    };
  }, []);

  // ----------------------- SYNCHRONISATION DES CHAMPS -----------------------
  const syncFieldDisplay = useCallback((blockId: string, forceUpdate = false) => {
    const block = document.getElementById(blockId);
    if (!block || !blockFields[blockId]) return;

    console.log('Syncing fields for block:', blockId, blockFields[blockId]); // Debug

    // Trier les champs par ordre pour maintenir la position correcte
    const sortedFields = [...blockFields[blockId]].sort((a, b) => a.order - b.order);
    console.log('Sorted fields by order:', sortedFields); // Debug

    // Mettre à jour tous les champs visibles dans le bloc
    const fieldItems = block.querySelectorAll('.field-item');
    console.log('Found field items:', fieldItems.length); // Debug
    
    // Vérifier si la synchronisation est nécessaire
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
      console.log('Updating field display...'); // Debug
      // Mettre à jour chaque champ avec sa position correcte
      fieldItems.forEach((fieldItem, index) => {
        if (sortedFields[index]) {
          const field = sortedFields[index];
        fieldItem.textContent = `• ${field.label}`;
          fieldItem.setAttribute('data-field', field.name);
          console.log(`Updated field display: ${field.label} at position ${index}`); // Debug
      } else {
        console.log(`No field data for index ${index}`); // Debug
      }
    });
    } else {
      console.log('No update needed for field display'); // Debug
    }
  }, [blockFields]);

  // ----------------------- MISE À JOUR DE L'AFFICHAGE DES CHAMPS -----------------------
  useEffect(() => {
    // Synchroniser l'affichage des champs quand blockFields change
    // Utiliser un délai pour éviter les conflits de synchronisation
    const timeoutId = setTimeout(() => {
    Object.keys(blockFields).forEach(blockId => {
        syncFieldDisplay(blockId, true); // Forcer la mise à jour
    });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [blockFields, syncFieldDisplay]);

  // ----------------------- GESTION DES CHAMPS -----------------------
  const handleFieldClick = useCallback((blockId: string, fieldName: string) => {
    console.log('handleFieldClick called:', { blockId, fieldName }); // Debug
    
    // Trouver le bloc parent
    const blockElement = document.getElementById(blockId);
    const blockType = blockElement?.querySelector('div:first-child')?.textContent || 'Unknown';
    
    // Vérifier si c'est un bloc de collecte (ID Collection ou Passport Collection)
    if (blockType === "ID Collection" || blockType === "Passport Collection") {
      // Ouvrir la modale de bloc avec tous les champs
      setEditingBlock({ blockId, blockType });
      setShowBlockModal(true);
    } else {
      console.log('Block type not supported for field editing:', blockType);
    }
  }, []);

  const handleFieldSave = useCallback((blockId: string, fieldName: string, value: string) => {
    setFieldData(prev => ({
      ...prev,
      [blockId]: {
        ...prev[blockId],
        [fieldName]: value
      }
    }));
    setEditingField(null);
    
    // Mettre à jour l'affichage du champ dans le bloc
    updateFieldDisplay(blockId, fieldName, value);
  }, []);

  const updateFieldDisplay = useCallback((blockId: string, fieldName: string, value: string) => {
    const block = document.getElementById(blockId);
    if (block) {
      const fieldItem = block.querySelector(`[data-field="${fieldName}"]`);
      if (fieldItem) {
        fieldItem.textContent = `• ${value}`;
        // console.log(`Updated field ${fieldName} in block ${blockId} with value: ${value}`);
      } else {
        // console.log(`Field ${fieldName} not found in block ${blockId}`);
      }
    } else {
      // console.log(`Block ${blockId} not found`);
    }
  }, []);

  const handleFieldCancel = useCallback(() => {
    setEditingField(null);
    setEditingBlock(null);
    setShowBlockModal(false);
    setEditingFieldIndex(null);
  }, []);

  const handleBlockModalClose = useCallback(() => {
    setShowBlockModal(false);
    setEditingBlock(null);
    setEditingFieldIndex(null);
  }, []);

  const getFieldValue = useCallback((blockId: string, fieldName: string): string => {
    return fieldData[blockId]?.[fieldName] || fieldName;
  }, [fieldData]);

  // ----------------------- HANDLERS DU MODAL -----------------------
  const updateFieldProperty = useCallback((blockId: string, fieldIndex: number, property: keyof FieldDefinition, value: any) => {
    console.log(`Updating field property: ${property} = ${value} for block ${blockId}, field ${fieldIndex}`); // Debug
    
    setBlockFields(prev => {
      const currentFields = prev[blockId] || [];
      let newFields = [...currentFields];
      
      // Si c'est un nouveau champ (fieldIndex = -1), l'ajouter seulement si nécessaire
      if (fieldIndex === -1 && currentFields.length === 0) {
        const newField: FieldDefinition = {
          name: "nouveau_champ",
          label: "Nouveau Champ",
          field_type: "text",
          is_required: false,
          is_multiple: false,
          order: 0,
          depends_on: ""
        };
        newFields.push(newField);
        fieldIndex = 0;
      }
      
      if (newFields[fieldIndex]) {
        const updatedField = { ...newFields[fieldIndex], [property]: value };
        
        // Si on change l'ordre, s'assurer qu'il n'y a pas de conflit
        if (property === 'order') {
          const newOrder = parseInt(value) || 0;
          const oldOrder = newFields[fieldIndex].order;
          
          // Vérifier si cet ordre est déjà utilisé par un autre champ
          const existingFieldWithOrder = newFields.find((field, index) => 
            index !== fieldIndex && field.order === newOrder
          );
          
          if (existingFieldWithOrder) {
            // Échanger les ordres si c'est un échange direct
            if (existingFieldWithOrder.order === oldOrder) {
              // Échange direct entre deux champs
              const existingIndex = newFields.findIndex(field => field === existingFieldWithOrder);
              newFields[existingIndex] = { ...existingFieldWithOrder, order: oldOrder };
            } else {
              // Décaler tous les champs entre l'ancien et le nouveau ordre
              newFields.forEach((field, index) => {
                if (index !== fieldIndex) {
                  if (oldOrder < newOrder && field.order > oldOrder && field.order <= newOrder) {
                    newFields[index] = { ...field, order: field.order - 1 };
                  } else if (oldOrder > newOrder && field.order >= newOrder && field.order < oldOrder) {
                    newFields[index] = { ...field, order: field.order + 1 };
                  }
                }
              });
            }
          }
        }
        
        newFields[fieldIndex] = updatedField;
        console.log(`Updated field:`, newFields[fieldIndex]); // Debug
        
        // Trier les champs par ordre pour maintenir la cohérence
        newFields.sort((a, b) => a.order - b.order);
        
        return { ...prev, [blockId]: newFields };
      }
      return prev;
    });
  }, []);

  // ----------------------- ENDPOINTS -----------------------
  function addEndpoints(instance: BrowserJsPlumbInstance, el: HTMLElement) {
    instance.addEndpoint(el, { anchor: "Right", endpoint: "Dot", source: true });
    instance.addEndpoint(el, { anchor: "Left", endpoint: "Dot", target: true });
    instance.setDraggable(el, true);
  }

  // ----------------------- CREATION BLOCS -----------------------
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData("block-type");
    const container = containerRef.current;
    if (!container || !jsPlumbInstanceRef.current) return;

    const newId = `block-${blockCounter.current++}`;
    const colorClass = colorMap[type] || "bg-gray-300";
    const newBlock = document.createElement("div");
    newBlock.id = newId;

    if (type === "Start" || type === "End") {
      newBlock.className = `${colorClass} absolute w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move`;
      newBlock.textContent = type;
    } else {
      newBlock.className =
        "absolute w-44 h-28 bg-white border border-gray-400 rounded-lg shadow-md flex flex-col overflow-hidden cursor-move";
      const header = document.createElement("div");
      header.className = `${colorClass} text-white text-xs font-semibold text-center py-1 border-b border-gray-400`;
      header.textContent = type;

      const body = document.createElement("div");
      body.className =
        "flex-1 flex items-center justify-center text-xs text-gray-700 bg-white px-2 text-center";
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
  }


  // ----------------------- CRÉATION WORKFLOW IDENTITÉ -----------------------
  function createIdentityWorkflow() {
    if (!containerRef.current || !jsPlumbInstanceRef.current) return;

    const container = containerRef.current;
    const instance = jsPlumbInstanceRef.current;

    // Positions pour organiser le workflow avec bloc conditionnel
    const positions = {
      choice: { top: 200, left: 50 },
      idCollection: { top: 100, left: 300 },
      passportCollection: { top: 300, left: 300 },
      confirmation: { top: 200, left: 550 },
      verification: { top: 200, left: 750 },
      success: { top: 100, left: 950 },
      failed: { top: 300, left: 950 }
    };

    // Créer les blocs du workflow
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
      
      if (block.type === "Start" || block.type === "End") {
        const colorClass = colorMap[block.type];
        element.className = `${colorClass} absolute w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold border border-black cursor-move`;
        element.textContent = block.type;
      } else {
        const colorClass = colorMap[block.type];
        // Ajuster la taille selon le type de bloc
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
      }

      element.style.top = `${block.pos.top}px`;
      element.style.left = `${block.pos.left}px`;

      container.appendChild(element);
      instance.manage(element);
      addEndpoints(instance, element);
    });

    // Créer les connexions avec des ancres spécifiques pour éviter de traverser les blocs
    setTimeout(() => {
      const choiceEl = document.getElementById("identity-choice");
      const idCollectionEl = document.getElementById("id-collection");
      const passportCollectionEl = document.getElementById("passport-collection");
      const confirmationEl = document.getElementById("confirmation");
      const verificationEl = document.getElementById("verification");
      const successEl = document.getElementById("success");
      const failedEl = document.getElementById("failed");

      // Connexions avec ancres spécifiques pour éviter de traverser les blocs
      // Identity Choice est un bloc conditionnel avec deux sorties du même point
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
      
      // Les deux chemins convergent vers la confirmation
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
      
      // Suite du workflow
      if (confirmationEl && verificationEl) instance.connect({ 
        source: confirmationEl, 
        target: verificationEl,
        anchors: ["Right", "Left"],
        paintStyle: { stroke: "#4A90E2", strokeWidth: 2 },
        endpointStyle: { fill: "#4A90E2", radius: 4 }
      });
      
      // Vérification avec deux résultats du même point
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

    // Initialiser les champs pour les blocs de collecte du workflow d'identité
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
  }

  function exportWorkflow() {
    if (!jsPlumbInstanceRef.current || !containerRef.current) return;
  
    // 🔹 Récupération des blocs
    const blocks = Array.from(containerRef.current.children)
      .filter((el) => el.id && !el.classList.contains("jtk-endpoint"))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const containerRect = containerRef.current!.getBoundingClientRect();
        const type =
          el.querySelector("div:first-child")?.textContent || el.textContent;
        const body = el.querySelector("div:last-child")?.textContent?.trim() || "";
        const blockData: any = {
          id: el.id,
          type,
          position: {
            top: Math.round(rect.top - containerRect.top),
            left: Math.round(rect.left - containerRect.left)
          },
          content: body,
        };

        // Ajouter les champs si le bloc a des champs personnalisés
        if (blockFields[el.id] && blockFields[el.id].length > 0) {
          blockData.fields = blockFields[el.id].map(field => ({
            name: field.name,
            label: field.label,
            field_type: field.field_type,
            is_required: field.is_required,
            is_multiple: field.is_multiple,
            order: field.order,
            depends_on: field.depends_on
          }));
          console.log(`Added fields to block ${el.id}:`, blockData.fields); // Debug
        }

        return blockData;
      });
  
    // 🔹 Récupération des connexions
    const connectionsData = jsPlumbInstanceRef.current.getConnections();
    const connections = Array.isArray(connectionsData) 
      ? connectionsData 
      : Object.values(connectionsData);
    const connectionsList = connections.map((conn, index) => ({
      id: `conn-${index}`,
      source: conn.sourceId,
      target: conn.targetId,
      type: "connection"
    }));
  
    const workflow = { 
      metadata: {
        name: "Identity Verification Workflow",
        version: "1.0.0",
        created_at: new Date().toISOString(),
        description: "Workflow for identity verification with customizable fields"
      },
      workflow: {
        blocks,
        connections: connectionsList
      }
    };
  
    // 🖥️ Afficher dans la console
    console.clear();
    console.log("🧱 Structure du workflow :");
    console.log(workflow);
    console.log("📜 JSON formaté :");
    console.log(JSON.stringify(workflow, null, 2));
    
    // 📊 Statistiques
    console.log("📊 Statistiques :");
    console.log(`- ${blocks.length} blocs`);
    console.log(`- ${connectionsList.length} connexions`);
    console.log(`- ${blocks.filter(b => b.fields).length} blocs avec champs personnalisés`);
    
    // 🔍 Détails des champs
    blocks.forEach(block => {
      if (block.fields && block.fields.length > 0) {
        console.log(`📝 Bloc "${block.type}" (${block.id}) :`);
        block.fields.forEach((field: FieldDefinition) => {
          console.log(`  - ${field.label} (${field.name}) - ${field.field_type} ${field.is_required ? 'requis' : 'optionnel'}`);
        });
      }
    });
  }
  
 
  // ----------------------- CRÉATION AUTOMATIQUE DE CHAMPS -----------------------
  // Supprimé pour simplifier - le modal créera les champs à la volée

  // ----------------------- MODAL D'ÉDITION DES BLOCS -----------------------
  const renderBlockEditModal = () => {
    if (!showBlockModal || !editingBlock) return null;

    const blockFieldsData = blockFields[editingBlock.blockId] || [];
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end z-50">
        <div className="bg-white shadow-xl w-1/2 h-full overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Configuration du bloc: {editingBlock.blockType}</h3>
              <button
                onClick={handleBlockModalClose}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto h-full">
            <div className="space-y-6">
              {/* Liste des champs existants */}
              {blockFieldsData.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Champs configurés:</h4>
                  {blockFieldsData
                    .sort((a, b) => a.order - b.order)
                    .map((field, index) => (
                      <div key={field.name} className="border border-gray-200 rounded-lg p-4">
                        {editingFieldIndex === index ? (
                          // Mode édition
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du champ</label>
                                <input
                                  type="text"
                                  defaultValue={field.name}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                  onChange={(e) => updateFieldProperty(editingBlock.blockId, index, 'name', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Label affiché</label>
                                <input
                                  type="text"
                                  defaultValue={field.label}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                  onChange={(e) => updateFieldProperty(editingBlock.blockId, index, 'label', e.target.value)}
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type de champ</label>
                                <select
                                  defaultValue={field.field_type}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                  onChange={(e) => updateFieldProperty(editingBlock.blockId, index, 'field_type', e.target.value)}
                                >
                                  <option value="text">Texte</option>
                                  <option value="number">Nombre</option>
                                  <option value="email">Email</option>
                                  <option value="date">Date</option>
                                  <option value="select">Sélection</option>
                                  <option value="checkbox">Case à cocher</option>
                                  <option value="textarea">Zone de texte</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
                                <input
                                  type="number"
                                  defaultValue={field.order}
                                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                  onChange={(e) => updateFieldProperty(editingBlock.blockId, index, 'order', parseInt(e.target.value) || 0)}
                                />
                              </div>
                            </div>
                            
                            <div className="flex space-x-4">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  defaultChecked={field.is_required}
                                  className="mr-2"
                                  onChange={(e) => updateFieldProperty(editingBlock.blockId, index, 'is_required', e.target.checked)}
                                />
                                <span className="text-sm text-gray-700">Requis</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  defaultChecked={field.is_multiple}
                                  className="mr-2"
                                  onChange={(e) => updateFieldProperty(editingBlock.blockId, index, 'is_multiple', e.target.checked)}
                                />
                                <span className="text-sm text-gray-700">Multiple</span>
                              </label>
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => setEditingFieldIndex(null)}
                                className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => {
                                  setEditingFieldIndex(null);
                                  setTimeout(() => syncFieldDisplay(editingBlock.blockId, true), 50);
                                }}
                                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Sauvegarder
                              </button>
                            </div>
                          </div>
                        ) : (
                          // Mode affichage
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h5 className="font-medium text-gray-800">{field.label}</h5>
                                <p className="text-xs text-gray-500">Type: {field.field_type} | Ordre: {field.order}</p>
                              </div>
                              <button
                                onClick={() => setEditingFieldIndex(index)}
                                className="text-blue-500 hover:text-blue-700 text-sm"
                              >
                                Éditer
                              </button>
                            </div>
                            
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>Requis: {field.is_required ? 'Oui' : 'Non'}</div>
                              <div>Multiple: {field.is_multiple ? 'Oui' : 'Non'}</div>
                              {field.depends_on && <div>Dépend de: {field.depends_on}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>Aucun champ configuré pour ce bloc</p>
                </div>
              )}
              
              {/* Bouton pour ajouter un nouveau champ */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => {
                    const newField: FieldDefinition = {
                      name: `nouveau_champ_${Date.now()}`,
                      label: "Nouveau Champ",
                      field_type: "text",
                      is_required: false,
                      is_multiple: false,
                      order: blockFieldsData.length,
                      depends_on: ""
                    };
                    
                    setBlockFields(prev => ({
                      ...prev,
                      [editingBlock.blockId]: [...(prev[editingBlock.blockId] || []), newField]
                    }));
                  }}
                  className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
                >
                  + Ajouter un nouveau champ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------- MODAL D'ÉDITION DES CHAMPS -----------------------
  const renderFieldEditModal = () => {
    console.log('renderFieldEditModal called, editingField:', editingField); // Debug
    console.log('Current blockFields:', blockFields); // Debug
    
    if (!editingField) {
      console.log('No editingField, modal not rendered'); // Debug
      return null;
    }

    const blockFieldsData = blockFields[editingField.blockId] || [];
    console.log('Looking for field:', editingField.fieldName, 'in fields:', blockFieldsData); // Debug
    
    // Chercher par nom ou par label
    let fieldIndex = blockFieldsData.findIndex(field => 
      field.name === editingField.fieldName || field.label === editingField.fieldName
    );
    let currentField = fieldIndex >= 0 ? blockFieldsData[fieldIndex] : null;
    
    console.log('Found field at index:', fieldIndex, 'field:', currentField); // Debug

    // Si le champ n'existe pas, utiliser le premier champ par défaut
    if (!currentField && blockFieldsData.length > 0) {
      console.log('Field not found, using first existing field'); // Debug
      currentField = blockFieldsData[0];
      fieldIndex = 0;
    } else if (!currentField) {
      console.log('No fields available, creating default'); // Debug
      // Déterminer l'ordre suivant disponible
      const maxOrder = blockFieldsData.length > 0 ? Math.max(...blockFieldsData.map(f => f.order)) : -1;
      currentField = {
        name: editingField.fieldName.toLowerCase().replace(/\s+/g, '_'),
        label: editingField.fieldName,
        field_type: "text",
        is_required: false,
        is_multiple: false,
        order: maxOrder + 1,
        depends_on: ""
      };
      fieldIndex = -1; // Indique que c'est un nouveau champ
    } else {
      console.log('Found existing field, will modify it'); // Debug
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Éditer le champ: {currentField.label}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom du champ</label>
              <input
                type="text"
                defaultValue={currentField.name}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="nom_du_champ"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'name', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label affiché</label>
              <input
                type="text"
                defaultValue={currentField.label}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Label affiché"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'label', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de champ</label>
              <select
                defaultValue={currentField.field_type}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'field_type', e.target.value)}
              >
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
                <option value="email">Email</option>
                <option value="date">Date</option>
                <option value="select">Sélection</option>
                <option value="checkbox">Case à cocher</option>
                <option value="textarea">Zone de texte</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordre d'affichage</label>
              <input
                type="number"
                defaultValue={currentField.order}
                min="0"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'order', parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Position dans la liste (0 = premier, 1 = deuxième, etc.)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dépend de</label>
              <input
                type="text"
                defaultValue={currentField.depends_on}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                placeholder="Nom du champ dont dépend ce champ"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'depends_on', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex space-x-4 mt-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                defaultChecked={currentField.is_required}
                className="mr-2"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'is_required', e.target.checked)}
              />
              <span className="text-sm text-gray-700">Requis</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                defaultChecked={currentField.is_multiple}
                className="mr-2"
                onChange={(e) => updateFieldProperty(editingField.blockId, fieldIndex, 'is_multiple', e.target.checked)}
              />
              <span className="text-sm text-gray-700">Multiple</span>
            </label>
          </div>
          
          {/* Aperçu de l'ordre des champs */}
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Ordre actuel des champs:</h4>
            <div className="space-y-1">
              {blockFieldsData
                .sort((a, b) => a.order - b.order)
                .map((field, index) => (
                  <div 
                    key={field.name} 
                    className={`text-xs p-2 rounded ${
                      field.name === currentField.name 
                        ? 'bg-blue-100 border border-blue-300' 
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    {index + 1}. {field.label} {field.name === currentField.name && '(en cours d\'édition)'}
                  </div>
                ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <button
              onClick={handleFieldCancel}
              className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                // Synchroniser l'affichage du bloc avec un délai pour s'assurer que les changements sont appliqués
                setTimeout(() => {
                  syncFieldDisplay(editingField.blockId, true);
                }, 50);
                handleFieldCancel();
              }}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    );
  };
 
  return (
    <div className="w-screen h-screen flex gap-4">
      {/* MENU LATÉRAL */}
      <div className="w-56 border border-gray-300 rounded-md p-3 flex flex-col gap-3 bg-gray-50 overflow-y-auto h-full">
        <h3 className="font-semibold text-center mb-1">🧱 Blocs disponibles</h3>

        {/* Boutons sauvegarde */}
        <div className="flex flex-col gap-2 mb-4">
          <button
            onClick={exportWorkflow}
            className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-1 rounded"
          >
            💾 Exporter Workflow
          </button>
        </div>

        {[{ label: "Actions", blocks: ["Identity Choice", "ID Collection", "Passport Collection", "Information Confirmation", "Identity Verification", "Verification Success", "Verification Failed"] }
        ].map((group) => (
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

      {/* ZONE DE WORKFLOW */}
      <div
        ref={containerRef}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="relative flex-1 border border-gray-300 rounded-md bg-white"
      >
        {/* Zone vide - l'utilisateur peut glisser-déposer des blocs depuis le menu latéral */}
      </div>
      
      {/* MODAL D'ÉDITION DES BLOCS */}
      {renderBlockEditModal()}
      
      {/* MODAL D'ÉDITION DES CHAMPS */}
      {renderFieldEditModal()}
    </div>
  );
}
