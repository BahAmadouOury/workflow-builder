export interface FieldDefinition {
  name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  is_multiple: boolean;
  order: number;
  depends_on: string;
}

export interface BlockData {
  id: string;
  type: string;
  position: {
    top: number;
    left: number;
  };
  content: string;
  fields?: FieldDefinition[];
}

export interface EditingField {
  blockId: string;
  fieldName: string;
}

export interface EditingBlock {
  blockId: string;
  blockType: string;
}

