import { Component, ComponentType } from './Component';

export interface MetadataComponent extends Component {
    readonly type: ComponentType.Metadata;
    name: string;
}

export const createMetadataComponent = (name: string): MetadataComponent => ({
    type: ComponentType.Metadata,
    name,
});
