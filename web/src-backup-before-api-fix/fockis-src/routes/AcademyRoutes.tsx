import { Routes, Route, Navigate } from "react-router-dom";

import AcademyLayout from "../components/academy/AcademyLayout";

import AcademyHome from "../pages/academy/AcademyHome";
import AcademyPrograms from "../pages/academy/AcademyPrograms";
import AcademyAcademics from "../pages/academy/AcademyAcademics";
import AcademyAdmissions from "../pages/academy/AcademyAdmissions";
import AcademyFinancialAid from "../pages/academy/AcademyFinancialAid";
import AcademyStudentLife from "../pages/academy/AcademyStudentLife";
import AcademyOnlineLearning from "../pages/academy/AcademyOnlineLearning";
import AcademyPortal from "../pages/academy/AcademyPortal";
import AcademyLms from "../pages/academy/AcademyLms";
import AcademyCareer from "../pages/academy/AcademyCareer";
import AcademyEmployers from "../pages/academy/AcademyEmployers";
import AcademyFaculty from "../pages/academy/AcademyFaculty";
import AcademyLibrary from "../pages/academy/AcademyLibrary";
import AcademyCalendar from "../pages/academy/AcademyCalendar";
import AcademyAbout from "../pages/academy/AcademyAbout";
import AcademyContact from "../pages/academy/AcademyContact";

// ============================================================================
// ACADEMY ADMIN
// ============================================================================

import AcademyAdminLayout from "../components/academy/admin/AcademyAdminLayout";
import AcademyAdminGuard from "../components/academy/admin/AcademyAdminGuard";

import AcademyAdminLogin from "../pages/academy/admin/AcademyAdminLogin";
import AcademyAdminDashboard from "../pages/academy/admin/AcademyAdminDashboard";
import AcademyAdminPrograms from "../pages/academy/admin/AcademyAdminPrograms";
import AcademyAdminCourses from "../pages/academy/admin/AcademyAdminCourses";
import AcademyAdminFaculty from "../pages/academy/admin/AcademyAdminFaculty";
import AcademyAdminStudents from "../pages/academy/admin/AcademyAdminStudents";
import AcademyAdminEvents from "../pages/academy/admin/AcademyAdminEvents";
import AcademyAdminNews from "../pages/academy/admin/AcademyAdminNews";
import AcademyAdminAdmissions from "../pages/academy/admin/AcademyAdminAdmissions";
import AcademyAdminJobs from "../pages/academy/admin/AcademyAdminJobs";
import AcademyAdminMessages from "../pages/academy/admin/AcademyAdminMessages";
import AcademyAdminEnrollments from "../pages/academy/admin/AcademyAdminEnrollments";
import AcademyAdminUsers from "../pages/academy/admin/AcademyAdminUsers";
import AcademyAdminContent from "../pages/academy/admin/AcademyAdminContent";
import AcademyAdminSettings from "../pages/academy/admin/AcademyAdminSettings";

/**
 * Academy route tree.
 *
 * Root:
 *   /academy
 *
 * Public:
 *   /academy/programs
 *   /academy/academics
 *   /academy/admissions
 *   /academy/financial-aid
 *   /academy/student-life
 *   /academy/online-learning
 *   /academy/portal
 *   /academy/lms
 *   /academy/career
 *   /academy/employers
 *   /academy/faculty
 *   /academy/library
 *   /academy/calendar
 *   /academy/about
 *   /academy/contact
 *
 * Admin:
 *   /academy/admin/login
 *   /academy/admin
 *   /academy/admin/dashboard
 *   /academy/admin/programs
 *   /academy/admin/courses
 *   /academy/admin/faculty
 *   /academy/admin/students
 *   /academy/admin/events
 *   /academy/admin/news
 *   /academy/admin/admissions
 *   /academy/admin/jobs
 *   /academy/admin/messages
 *   /academy/admin/enrollments
 *   /academy/admin/users
 *   /academy/admin/content
 *   /academy/admin/settings
 */
export default function AcademyRoutes() {
  return (
    <Routes>

      {/* ================================================================== */}
      {/* PUBLIC ACADEMY                                                     */}
      {/* ================================================================== */}

      <Route element={<AcademyLayout />}>

        {/* /academy */}
        <Route
          index
          element={<AcademyHome />}
        />

        {/* /academy/programs */}
        <Route
          path="programs"
          element={<AcademyPrograms />}
        />

        {/* /academy/academics */}
        <Route
          path="academics"
          element={<AcademyAcademics />}
        />

        {/* /academy/admissions */}
        <Route
          path="admissions"
          element={<AcademyAdmissions />}
        />

        {/* /academy/financial-aid */}
        <Route
          path="financial-aid"
          element={<AcademyFinancialAid />}
        />

        {/* /academy/student-life */}
        <Route
          path="student-life"
          element={<AcademyStudentLife />}
        />

        {/* /academy/online-learning */}
        <Route
          path="online-learning"
          element={<AcademyOnlineLearning />}
        />

        {/* /academy/portal */}
        <Route
          path="portal"
          element={<AcademyPortal />}
        />

        {/* /academy/lms */}
        <Route
          path="lms"
          element={<AcademyLms />}
        />

        {/* /academy/career */}
        <Route
          path="career"
          element={<AcademyCareer />}
        />

        {/* /academy/employers */}
        <Route
          path="employers"
          element={<AcademyEmployers />}
        />

        {/* /academy/faculty */}
        <Route
          path="faculty"
          element={<AcademyFaculty />}
        />

        {/* /academy/library */}
        <Route
          path="library"
          element={<AcademyLibrary />}
        />

        {/* /academy/calendar */}
        <Route
          path="calendar"
          element={<AcademyCalendar />}
        />

        {/* /academy/about */}
        <Route
          path="about"
          element={<AcademyAbout />}
        />

        {/* /academy/contact */}
        <Route
          path="contact"
          element={<AcademyContact />}
        />

      </Route>


      {/* ================================================================== */}
      {/* ADMIN LOGIN                                                        */}
      {/* ================================================================== */}

      {/* /academy/admin/login */}
      <Route
        path="admin/login"
        element={<AcademyAdminLogin />}
      />


      {/* ================================================================== */}
      {/* PROTECTED ADMIN                                                    */}
      {/* ================================================================== */}

      <Route
        path="admin"
        element={
          <AcademyAdminGuard>
            <AcademyAdminLayout />
          </AcademyAdminGuard>
        }
      >

        {/* ================================================================ */}
        {/* /academy/admin                                                   */}
        {/* ================================================================ */}

        <Route
          index
          element={
            <Navigate
              to="/academy/admin/dashboard"
              replace
            />
          }
        />

        {/* ================================================================ */}
        {/* DASHBOARD                                                        */}
        {/* ================================================================ */}

        {/* /academy/admin/dashboard */}
        <Route
          path="dashboard"
          element={<AcademyAdminDashboard />}
        />

        {/* ================================================================ */}
        {/* PROGRAMS                                                         */}
        {/* ================================================================ */}

        {/* /academy/admin/programs */}
        <Route
          path="programs"
          element={<AcademyAdminPrograms />}
        />

        {/* ================================================================ */}
        {/* COURSES                                                          */}
        {/* ================================================================ */}

        {/* /academy/admin/courses */}
        <Route
          path="courses"
          element={<AcademyAdminCourses />}
        />

        {/* ================================================================ */}
        {/* FACULTY                                                          */}
        {/* ================================================================ */}

        {/* /academy/admin/faculty */}
        <Route
          path="faculty"
          element={<AcademyAdminFaculty />}
        />

        {/* ================================================================ */}
        {/* STUDENTS                                                         */}
        {/* ================================================================ */}

        {/* /academy/admin/students */}
        <Route
          path="students"
          element={<AcademyAdminStudents />}
        />

        {/* ================================================================ */}
        {/* EVENTS                                                           */}
        {/* ================================================================ */}

        {/* /academy/admin/events */}
        <Route
          path="events"
          element={<AcademyAdminEvents />}
        />

        {/* ================================================================ */}
        {/* NEWS                                                             */}
        {/* ================================================================ */}

        {/* /academy/admin/news */}
        <Route
          path="news"
          element={<AcademyAdminNews />}
        />

        {/* ================================================================ */}
        {/* ADMISSIONS                                                       */}
        {/* ================================================================ */}

        {/* /academy/admin/admissions */}
        <Route
          path="admissions"
          element={<AcademyAdminAdmissions />}
        />

        {/* ================================================================ */}
        {/* JOBS                                                             */}
        {/* ================================================================ */}

        {/* /academy/admin/jobs */}
        <Route
          path="jobs"
          element={<AcademyAdminJobs />}
        />

        {/* ================================================================ */}
        {/* MESSAGES                                                         */}
        {/* ================================================================ */}

        {/* /academy/admin/messages */}
        <Route
          path="messages"
          element={<AcademyAdminMessages />}
        />

        {/* ================================================================ */}
        {/* ENROLLMENTS                                                      */}
        {/* ================================================================ */}

        {/* /academy/admin/enrollments */}
        <Route
          path="enrollments"
          element={<AcademyAdminEnrollments />}
        />

        {/* ================================================================ */}
        {/* USERS                                                            */}
        {/* ================================================================ */}

        {/* /academy/admin/users */}
        <Route
          path="users"
          element={<AcademyAdminUsers />}
        />

        {/* ================================================================ */}
        {/* CONTENT                                                          */}
        {/* ================================================================ */}

        {/* /academy/admin/content */}
        <Route
          path="content"
          element={<AcademyAdminContent />}
        />

        {/* ================================================================ */}
        {/* SETTINGS                                                         */}
        {/* ================================================================ */}

        {/* /academy/admin/settings */}
        <Route
          path="settings"
          element={<AcademyAdminSettings />}
        />

        {/* ================================================================ */}
        {/* UNKNOWN ADMIN ROUTE                                              */}
        {/* ================================================================ */}

        <Route
          path="*"
          element={
            <Navigate
              to="/academy/admin/dashboard"
              replace
            />
          }
        />

      </Route>


      {/* ================================================================== */}
      {/* UNKNOWN ACADEMY ROUTE                                              */}
      {/* ================================================================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/academy"
            replace
          />
        }
      />

    </Routes>
  );
}