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

declare module "nicoleApp/BirthdayFeature" {
  import type { ComponentType } from "react";

  export type BirthdayFeatureProps = {
    workspaceId?: string;
    workspaceName?: string;
    currentUserEmail?: string;
  };

  const BirthdayFeature: ComponentType<BirthdayFeatureProps>;
  export default BirthdayFeature;
}
