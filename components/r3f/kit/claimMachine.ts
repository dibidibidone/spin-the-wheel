export type ClaimStep = "hidden" | "reveal" | "form" | "submitting" | "redirect";
export type ClaimAction = { type: "won" } | { type: "open" } | { type: "submit" } | { type: "done" } | { type: "reset" };

export function claimReducer(state: ClaimStep, action: ClaimAction): ClaimStep {
  if (action.type === "reset") return "hidden";
  switch (state) {
    case "hidden": return action.type === "won" ? "reveal" : state;
    case "reveal": return action.type === "open" ? "form" : state;
    case "form": return action.type === "submit" ? "submitting" : state;
    case "submitting": return action.type === "done" ? "redirect" : state;
    default: return state;
  }
}
