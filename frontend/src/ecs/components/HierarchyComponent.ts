import { Component, ComponentType } from './Component';

export interface HierarchyComponent extends Component {
    readonly type: ComponentType.Hierarchy;
    parentId: string | null;
    childrenIds: string[];
}

export const createHierarchyComponent = (
    parentId: string | null = null,
    childrenIds: string[] = [],
): HierarchyComponent => ({
    type: ComponentType.Hierarchy,
    parentId,
    childrenIds: [...childrenIds],
});
