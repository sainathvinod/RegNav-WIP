import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';

// Simple Dashboard for now
const Dashboard: React.FC = () => {
  return (
    <AppLayout title="Dashboard">
      <div className="card mb-6 bg-gradient-to-r from-primary-500 to-primary-700 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to RegNav.AI</h2>
            <p className="text-primary-100">
              AI-Powered Regulatory Compliance Navigator
            </p>
          </div>
          <div className="text-6xl opacity-20">🧭</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Organizations</p>
              <p className="text-3xl font-bold text-gray-900">3</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl">
              🏢
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Rules</p>
              <p className="text-3xl font-bold text-gray-900">156</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-2xl">
              ⚖️
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Validations</p>
              <p className="text-3xl font-bold text-gray-900">24</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">
              ✅
            </div>
          </div>
        </div>

        <div className="card hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Compliance Score</p>
              <p className="text-3xl font-bold text-gray-900">94.5%</p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center text-2xl">
              📊
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🚀 Quick Start Guide</h3>
        <p className="text-gray-600 mb-4">
          Your end-to-end RegNav.AI UI framework is ready! Here's what you can do:
        </p>
        <ol className="space-y-3">
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full font-medium mr-3 text-sm">1</span>
            <div>
              <p className="font-medium text-gray-900">Complete Component Setup</p>
              <p className="text-sm text-gray-600">Copy all component code from COMPLETE_FRONTEND_CODE.md</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full font-medium mr-3 text-sm">2</span>
            <div>
              <p className="font-medium text-gray-900">Explore the Navigation</p>
              <p className="text-sm text-gray-600">Check out the sidebar with all 5 AI agents and collapsible feature</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full font-medium mr-3 text-sm">3</span>
            <div>
              <p className="font-medium text-gray-900">Test the Flow</p>
              <p className="text-sm text-gray-600">Organization → Configuration → RegScout → RegValidate</p>
            </div>
          </li>
        </ol>
      </div>
    </AppLayout>
  );
};

// Placeholder pages
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => {
  return (
    <AppLayout title={title}>
      <div className="card">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-4">
            This page is ready to be implemented. Copy the code from COMPLETE_FRONTEND_CODE.md
          </p>
          <p className="text-sm text-gray-500">
            All component structure and mock data is already set up!
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/organizations" element={<PlaceholderPage title="Organizations" />} />
        <Route path="/configuration" element={<PlaceholderPage title="Configuration" />} />
        <Route path="/regscout" element={<PlaceholderPage title="RegScout - Document Discovery" />} />
        <Route path="/regingest" element={<PlaceholderPage title="RegIngest - Document Repository" />} />
        <Route path="/ruleminer" element={<PlaceholderPage title="RuleMiner - Rule Extraction" />} />
        <Route path="/rulesense" element={<PlaceholderPage title="RuleSense - AI Insights" />} />
        <Route path="/regvalidate" element={<PlaceholderPage title="RegValidate - File Validation" />} />
        <Route path="/analytics" element={<PlaceholderPage title="Analytics" />} />
        <Route path="/reports" element={<PlaceholderPage title="Reports" />} />
      </Routes>
    </Router>
  );
}

export default App;
