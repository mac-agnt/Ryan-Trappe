import JobsPage from "./JobsPage";
import InvoicesPage from "./InvoicesPage";
import CostsPage from "./CostsPage";
import PlantPage from "./PlantPage";
import WorkPage from "./WorkPage";
import DashboardPage from "./DashboardPage";
import AgentsPage from "./AgentsPage";
import ActivityPage from "./ActivityPage";
import SettingsPage from "./SettingsPage";

/* The client modules. Home, Records and Ontology stay on the template views. */
export default function DemoPages({ v }: { v: any }) {
  switch (v.demoPage) {
    case "Jobs": return <JobsPage />;
    case "Invoices": return <InvoicesPage />;
    case "Costs": return <CostsPage />;
    case "Plant": return <PlantPage />;
    case "Work": return <WorkPage />;
    case "Dashboard": return <DashboardPage />;
    case "Agents": return <AgentsPage />;
    case "Activity": return <ActivityPage />;
    case "Settings": return <SettingsPage theme={v.theme} toggleTheme={v.toggleTheme} onReset={v.newThread} />;
    default: return null;
  }
}
