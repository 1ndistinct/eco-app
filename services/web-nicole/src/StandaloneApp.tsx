import BirthdayFeature from "./exposed/BirthdayFeature";

function readPreviewContext() {
  if (typeof window === "undefined") {
    return {
      workspaceId: "",
      workspaceName: "",
      currentUserEmail: "",
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    workspaceId: params.get("workspace") ?? "",
    workspaceName: params.get("workspaceName") ?? "",
    currentUserEmail: params.get("user") ?? "",
  };
}

export function StandaloneApp() {
  const previewContext = readPreviewContext();

  return <BirthdayFeature {...previewContext} />;
}
