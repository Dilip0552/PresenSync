import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, where, getDocs } from "firebase/firestore";
import { useFirebase } from './FirebaseContext';
import Spinner from "./Spinner";
import { Plus, Users, User, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AdminClassManagement({ addNotification }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { db } = useFirebase();
  const appId = typeof __app_id !== 'undefined' ? __app_id : import.meta.env.VITE_FIREBASE_PROJECT_ID;

  useEffect(() => {
    const fetchAllClasses = async () => {
      if (!db) return;
      setLoading(true);
      try {
        // Step 1: Get all teacher UIDs
        const teachersRef = collection(db, `artifacts/${appId}/public/data/allUserProfiles`);
        const teachersQuery = query(teachersRef, where("role", "==", "teacher"));
        const teacherDocs = await getDocs(teachersQuery);
        const teachers = teacherDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const allClasses = [];
        const promises = teachers.map(async (teacher) => {
          const classesRef = collection(db, `artifacts/${appId}/users/${teacher.id}/classes`);
          const classesQuery = query(classesRef);
          const classDocs = await getDocs(classesQuery);
          
          classDocs.forEach(classDoc => {
            allClasses.push({
              id: classDoc.id,
              teacherId: teacher.id,
              teacherName: teacher.fullName || teacher.email,
              ...classDoc.data()
            });
          });
        });

        await Promise.all(promises);
        setClasses(allClasses);
      } catch (error) {
        console.error("Error fetching all classes:", error);
        addNotification("Failed to load classes.", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchAllClasses();
  }, [db, appId, addNotification]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-6 bg-white rounded-lg shadow-md"
    >
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <BookOpen size={24} className="text-blue-600" /> Classes & Teacher Management
      </h2>
      <p className="text-gray-600 mb-8">Manage all classes and their assigned teachers across the platform. (Future functionality: Add/remove students and teachers directly from here).</p>

      {loading ? (
        <Spinner message="Loading all classes..." />
      ) : (
        <div className="overflow-x-auto rounded-lg shadow-inner bg-gray-50 border border-gray-100">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="text-xs bg-blue-100 text-blue-800 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Class Name</th>
                <th className="px-6 py-3">Teacher</th>
                <th className="px-6 py-3">Subject</th>
                <th className="px-6 py-3">Students</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">No classes found.</td>
                </tr>
              ) : (
                classes.map(cls => (
                  <tr key={cls.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">{cls.name}</td>
                    <td className="px-6 py-4">{cls.teacherName || 'N/A'}</td>
                    <td className="px-6 py-4">{cls.subject || 'N/A'}</td>
                    <td className="px-6 py-4">{cls.enrollmentCount || 0}</td>
                    <td className="px-6 py-4 flex space-x-2">
                      <button
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-300 transition-colors"
                        disabled
                      >
                        View Details (Coming soon)
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}

export default AdminClassManagement;