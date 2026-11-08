import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import AcademyLayout, { AcademyFullPage } from "../components/academy/AcademyLayout";

import AcademyHome from "../pages/academy/AcademyHome";
import AcademyPrograms from "../pages/academy/AcademyPrograms";
import AcademyAcademics from "../pages/academy/AcademyAcademics";
import AcademyAdmissions from "../pages/academy/AcademyAdmissions";
import AcademyFinancialAid from "../pages/academy/AcademyFinancialAid";
import AcademyStudentLife from "../pages/academy/AcademyStudentLife";
import AcademyOnlineLearning from "../pages/academy/AcademyOnlineLearning";
import AcademyPortal from "../pages/academy/AcademyPortal";
import AcademyCareer from "../pages/academy/AcademyCareer";
import AcademyEmployers from "../pages/academy/AcademyEmployers";
import AcademyFaculty from "../pages/academy/AcademyFaculty";
import AcademyLibrary from "../pages/academy/AcademyLibrary";
import AcademyCalendar from "../pages/academy/AcademyCalendar";
import AcademyAbout from "../pages/academy/AcademyAbout";
import AcademyContact from "../pages/academy/AcademyContact";

// ============================================================================
// LEARNING MARKETPLACE (2026-11 redesign)
// ============================================================================

import AcademyCampus from "../pages/academy/AcademyCampus";
import CourseExplore from "../pages/academy/learn/CourseExplore";
import CourseDetails from "../pages/academy/learn/CourseDetails";
import InstructorDashboard from "../pages/academy/learn/InstructorDashboard";
import CreatorStudio, { StudioNew } from "../pages/academy/studio/CreatorStudio";
import StudioEditor from "../pages/academy/studio/StudioEditor";
import AcademyCheckout from "../pages/academy/studio/AcademyCheckout";
import SchoolDomainCheckout from "../pages/academy/institutions/SchoolDomainCheckout";
import RegisterSchool from "../pages/academy/institutions/RegisterSchool";
import SchoolDashboard, { MySchools } from "../pages/academy/institutions/SchoolDashboard";
import { SchoolPage, SchoolsDirectory } from "../pages/academy/institutions/SchoolPages";
import ChangePassword from "../pages/academy/ChangePassword";
import AcademyAdminInstitutions from "../pages/academy/admin/AcademyAdminInstitutions";
import { useAcademySession } from "../lib/academySession";

/**
 * Accounts created by a school start with a temporary password: send them to
 * /academy/change-password before anything else (the API enforces it too).
 */
function PasswordGate() {
  const session = useAcademySession();
  const { pathname } = useLocation();
  const must = session.status === "user" && !!(session.user as { mustChangePassword?: boolean } | null)?.mustChangePassword;
  if (!must || /^\/academy\/(change-password|login)/.test(pathname)) return null;
  return <Navigate to={`/academy/change-password?next=${encodeURIComponent(pathname)}`} replace />;
}

// Design-board screens added in the 2026-11 redesign (real endpoints only)
import { BecomeInstructor, InstructorApplication, CourseBuilder } from "../pages/academy/market/TeachPages";
import EventDetails from "../pages/academy/market/EventDetails";
import StudentCertificates from "../pages/academy/market/StudentCertificates";
import AcademyClassroom from "../pages/academy/market/AcademyClassroom";
import CertificateDesigner from "../pages/academy/certificates/CertificateDesigner";
import InstructorCertificates from "../pages/academy/certificates/InstructorCertificates";
import VerifyCertificate from "../pages/academy/certificates/VerifyCertificate";
import AcademyLogin from "../pages/academy/AcademyLogin";

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
 *   /academy/campus          (previous homepage, preserved)
 *   /academy/learn           (course catalog)
 *   /academy/learn/:code     (course details)
 *   /academy/events/:id      (seminar / event details)
 *   /academy/teach           (become an instructor)
 *   /academy/teach/apply     (instructor application)
 *   /academy/portal/certificates  (student certificates)
 *   /academy/instructor[/:section]  (instructor dashboard, own layout)
 *   /academy/instructor/course/new  (course builder, own layout)
 *   /academy/classroom/:code (learning player: videos, PDFs, tests, live sessions)
 *   /academy/studio          (Creator Studio — anyone can publish classes)
 *   /academy/studio/new      (create a course / seminar / workshop / live class)
 *   /academy/studio/:code    (edit lessons, price, certificate, learners)
 *   /academy/checkout/:code  (buy a paid class through the existing Fockis checkout)
 *   /academy/schools, /academy/schools/:slug, /academy/schools/register
 *   /academy/school, /academy/school/:id   (school staff: students, applications, staff)
 *   /academy/school/:id/pay  (pay / renew the Fockis domain through the existing checkout)
 *   /academy/change-password  (required after a temporary password)
 *   /academy/admin/institutions (Fockis admins review schools)
 *   /academy/instructor/certificates            (templates, issue, issued)
 *   /academy/instructor/certificates/designer[/:id]
 *   /academy/verify[/:code]  (public verification: certificate no., QR id or enrollment ID)
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
    <>
    <PasswordGate />
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


        {/* /academy/lms — removed; the Student Portal replaces it */}
        <Route
          path="lms"
          element={<Navigate to="/academy/portal" replace />}
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

        {/* /academy/campus — previous homepage */}
        <Route
          path="campus"
          element={<AcademyCampus />}
        />

        {/* /academy/learn — course catalog */}
        <Route
          path="learn"
          element={<CourseExplore />}
        />

        {/* /academy/learn/:code — course details */}
        <Route
          path="learn/:code"
          element={<CourseDetails />}
        />

        {/* /academy/events/:id — seminar details & registration */}
        <Route
          path="events/:id"
          element={<EventDetails />}
        />

        {/* /academy/verify[/:code] — public certificate & enrollment verification */}
        <Route
          path="verify"
          element={<VerifyCertificate />}
        />
        <Route
          path="verify/:code"
          element={<VerifyCertificate />}
        />
        <Route
          path="verify-certificate/:code"
          element={<VerifyCertificate />}
        />

        {/* Schools on Fockis */}
        <Route path="schools" element={<SchoolsDirectory />} />
        <Route path="schools/:slug" element={<SchoolPage />} />

        {/* /academy/teach — become an instructor */}
        <Route
          path="teach"
          element={<BecomeInstructor />}
        />

        {/* /academy/teach/apply — instructor application */}
        <Route
          path="teach/apply"
          element={<InstructorApplication />}
        />

      </Route>


      {/* ================================================================== */}
      {/* FULL-PAGE LAYOUTS (dashboards, builder, classroom)                 */}
      {/* ================================================================== */}

      {/* /academy/login, /academy/register — student & instructor accounts */}
      <Route
        path="login"
        element={<AcademyFullPage><AcademyLogin mode="signin" /></AcademyFullPage>}
      />
      <Route
        path="register"
        element={<AcademyFullPage><AcademyLogin mode="register" /></AcademyFullPage>}
      />

      <Route
        path="portal"
        element={<AcademyFullPage><AcademyPortal /></AcademyFullPage>}
      />

      <Route
        path="portal/certificates"
        element={<AcademyFullPage><StudentCertificates /></AcademyFullPage>}
      />

      <Route
        path="instructor/certificates"
        element={<AcademyFullPage><InstructorCertificates /></AcademyFullPage>}
      />

      <Route
        path="instructor/certificates/designer"
        element={<AcademyFullPage><CertificateDesigner /></AcademyFullPage>}
      />

      <Route
        path="instructor/certificates/designer/:id"
        element={<AcademyFullPage><CertificateDesigner /></AcademyFullPage>}
      />

      <Route
        path="instructor/course/new"
        element={<AcademyFullPage><CourseBuilder /></AcademyFullPage>}
      />

      <Route
        path="classroom/:code"
        element={<AcademyClassroom />}
      />

      {/* Schools: registration and staff dashboard, password change */}
      <Route path="schools/register" element={<AcademyFullPage><RegisterSchool /></AcademyFullPage>} />
      <Route path="school" element={<AcademyFullPage><MySchools /></AcademyFullPage>} />
      <Route path="school/:id" element={<AcademyFullPage><SchoolDashboard /></AcademyFullPage>} />
      {/* pay / renew the school's Fockis domain (price set in the Admin Center) */}
      <Route path="school/:id/pay" element={<AcademyFullPage><SchoolDomainCheckout /></AcademyFullPage>} />
      <Route path="change-password" element={<AcademyFullPage><ChangePassword /></AcademyFullPage>} />

      {/* Creator Studio — open marketplace (any signed-in Academy account) */}
      <Route
        path="studio"
        element={<AcademyFullPage><CreatorStudio /></AcademyFullPage>}
      />
      <Route
        path="studio/new"
        element={<AcademyFullPage><StudioNew /></AcademyFullPage>}
      />
      <Route
        path="studio/:code"
        element={<AcademyFullPage><StudioEditor /></AcademyFullPage>}
      />
      <Route
        path="checkout/:code"
        element={<AcademyFullPage><AcademyCheckout /></AcademyFullPage>}
      />


      {/* ================================================================== */}
      {/* INSTRUCTOR DASHBOARD (own full-page layout)                        */}
      {/* ================================================================== */}

      <Route
        path="instructor"
        element={<InstructorDashboard />}
      />

      <Route
        path="instructor/:section"
        element={<InstructorDashboard />}
      />


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

        {/* /academy/admin/institutions — review schools */}
        <Route
          path="institutions"
          element={<AcademyAdminInstitutions />}
        />

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
    </>
  );
}