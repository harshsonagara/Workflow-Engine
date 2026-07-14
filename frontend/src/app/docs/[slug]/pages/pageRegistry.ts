import IntroductionPage from "./IntroductionPage";
import ArchitecturePage from "./ArchitecturePage";
import CoreConceptsPage from "./CoreConceptsPage";
import LifecyclePage from "./LifecyclePage";
import ApiAuthPage from "./ApiAuthPage";
import ApiDefinitionPage from "./ApiDefinitionPage";
import ApiRuntimePage from "./ApiRuntimePage";
import ApiMappingPage from "./ApiMappingPage";
import SchemaPage from "./SchemaPage";
import ExamplePage from "./ExamplePage";
import SlaPage from "./SlaPage";
import TroubleshootingPage from "./TroubleshootingPage";
import CheatsheetPage from "./CheatsheetPage";

/** Slug → React component map for all doc pages. */
export const PAGES: Record<string, React.ComponentType> = {
  introduction:     IntroductionPage,
  architecture:     ArchitecturePage,
  "core-concepts":  CoreConceptsPage,
  lifecycle:        LifecyclePage,
  "api-auth":       ApiAuthPage,
  "api-definition": ApiDefinitionPage,
  "api-runtime":    ApiRuntimePage,
  "api-mapping":    ApiMappingPage,
  schema:           SchemaPage,
  example:          ExamplePage,
  sla:              SlaPage,
  troubleshooting:  TroubleshootingPage,
  cheatsheet:       CheatsheetPage,
};
