import { useState, useCallback } from 'react';
import { FieldDefinition, EditingField, EditingBlock } from '../types';

export const useFieldManagement = () => {
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editingBlock, setEditingBlock] = useState<EditingBlock | null>(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldData, setFieldData] = useState<Record<string, Record<string, string>>>({});
  const [blockFields, setBlockFields] = useState<Record<string, FieldDefinition[]>>({});

  const handleFieldClick = useCallback((blockId: string, fieldName: string) => {
    const blockElement = document.getElementById(blockId);
    const blockType = blockElement?.querySelector('div:first-child')?.textContent || 'Unknown';
    
    // Ouvrir la modale pour tous les types de blocs
    setEditingBlock({ blockId, blockType });
    setShowBlockModal(true);
  }, []);

  const handleBlockDoubleClick = useCallback((blockId: string, blockType: string) => {
    // Ouvrir la modale pour tous les types de blocs
    setEditingBlock({ blockId, blockType });
    setShowBlockModal(true);
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

  const updateFieldProperty = useCallback((blockId: string, fieldIndex: number, property: keyof FieldDefinition, value: any) => {
    setBlockFields(prev => {
      const currentFields = prev[blockId] || [];
      let newFields = [...currentFields];
      
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
        
        if (property === 'order') {
          const newOrder = parseInt(value) || 0;
          const oldOrder = newFields[fieldIndex].order;
          
          const existingFieldWithOrder = newFields.find((field, index) => 
            index !== fieldIndex && field.order === newOrder
          );
          
          if (existingFieldWithOrder) {
            if (existingFieldWithOrder.order === oldOrder) {
              const existingIndex = newFields.findIndex(field => field === existingFieldWithOrder);
              newFields[existingIndex] = { ...existingFieldWithOrder, order: oldOrder };
            } else {
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
        newFields.sort((a, b) => a.order - b.order);
        
        return { ...prev, [blockId]: newFields };
      }
      return prev;
    });
  }, []);

  return {
    editingField,
    editingBlock,
    showBlockModal,
    editingFieldIndex,
    fieldData,
    blockFields,
    setEditingField,
    setEditingBlock,
    setShowBlockModal,
    setEditingFieldIndex,
    setFieldData,
    setBlockFields,
    handleFieldClick,
    handleBlockDoubleClick,
    handleFieldCancel,
    handleBlockModalClose,
    updateFieldProperty
  };
};

