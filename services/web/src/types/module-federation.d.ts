declare module "todoApp/TodoFeature" {
  import type { ComponentType } from "react";

  export type TodoFeatureProps = {
    workspaceId: string;
    workspaceName: string;
    currentUserEmail?: string;
  };

  const TodoFeature: ComponentType<TodoFeatureProps>;
  export default TodoFeature;
}
