import React from 'react';
import { Settings, User, Database, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

function AdminSettings() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 bg-white rounded-lg shadow-md"
    >
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Settings size={24} className="text-blue-600" /> Admin Settings
      </h2>
      <p className="text-gray-600 mb-8">Configure system-wide settings, user preferences, and security policies.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 flex items-start space-x-4">
          <User size={24} className="text-purple-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg text-gray-800">User & Access Control</h3>
            <p className="text-sm text-gray-500 mt-1">Manage default user roles and sign-up policies. (Future Implementation)</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 flex items-start space-x-4">
          <Database size={24} className="text-green-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg text-gray-800">Data & Integrations</h3>
            <p className="text-sm text-gray-500 mt-1">Configure database backups and third-party integrations. (Future Implementation)</p>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-100 flex items-start space-x-4">
          <Shield size={24} className="text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-lg text-gray-800">Security Policies</h3>
            <p className="text-sm text-gray-500 mt-1">Set password requirements and session duration limits. (Future Implementation)</p>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800 text-sm">
          <span className="font-bold">Note:</span> This page is currently a placeholder. Advanced settings functionality will be implemented in future updates.
        </p>
      </div>
    </motion.div>
  );
}

export default AdminSettings;