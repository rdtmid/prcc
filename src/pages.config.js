import AIInsights from './pages/AIInsights';
import Campaigns from './pages/Campaigns';
import CrisisCenter from './pages/CrisisCenter';
import Dashboard from './pages/Dashboard';
import Influencers from './pages/Influencers';
import MediaRelations from './pages/MediaRelations';
import Monitoring from './pages/Monitoring';
import PressRelease from './pages/PressRelease';
import Tasks from './pages/Tasks';
import DataMigration from './pages/DataMigration';
import Analytics from './pages/Analytics';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIInsights": AIInsights,
    "Campaigns": Campaigns,
    "CrisisCenter": CrisisCenter,
    "Dashboard": Dashboard,
    "Influencers": Influencers,
    "MediaRelations": MediaRelations,
    "Monitoring": Monitoring,
    "PressRelease": PressRelease,
    "Tasks": Tasks,
    "DataMigration": DataMigration,
    "Analytics": Analytics,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};