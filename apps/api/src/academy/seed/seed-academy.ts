/**
 * Seeds every Academy collection with the same demo data the frontend
 * currently ships statically in src/data/academy/*.ts — so switching the
 * frontend from demo data to this API changes nothing visually.
 *
 * Run directly with ts-node (adjust the Mongo URI / import path for your
 * setup), independent of your app's NestFactory bootstrap so it doesn't
 * need to guess your AppModule wiring:
 *
 *   MONGODB_URI="mongodb://localhost:27017/your-db" npx ts-node src/academy/seed/seed-academy.ts
 *
 * If this app already has a seed runner (see run-seed.ts elsewhere in the
 * codebase), you can instead import and call `seedAcademy()` from there.
 */
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ProgramSchema } from '../programs/schemas/program.schema';
import { FacultySchema } from '../faculty/schemas/faculty.schema';
import { JobSchema } from '../career/schemas/job.schema';
import { NewsItemSchema } from '../news/schemas/news.schema';
import { CampusEventSchema } from '../events/schemas/event.schema';
import { StudentSchema } from '../students/schemas/student.schema';
import { CourseSchema } from '../courses/schemas/course.schema';
import { EnrollmentSchema } from '../courses/schemas/enrollment.schema';
import { ContentItemSchema } from '../content/schemas/content-item.schema';
import { AcademyUserSchema } from '../auth/schemas/academy-user.schema';

const ProgramModel = mongoose.model('Program', ProgramSchema);
const FacultyModel = mongoose.model('Faculty', FacultySchema);
const JobModel = mongoose.model('Job', JobSchema);
const NewsItemModel = mongoose.model('NewsItem', NewsItemSchema);
const CampusEventModel = mongoose.model('CampusEvent', CampusEventSchema);
const StudentModel = mongoose.model('Student', StudentSchema);
const CourseModel = mongoose.model('Course', CourseSchema);
const EnrollmentModel = mongoose.model('Enrollment', EnrollmentSchema);
const ContentItemModel = mongoose.model('ContentItem', ContentItemSchema);
const AcademyUserModel = mongoose.model('AcademyUser', AcademyUserSchema);

const PROGRAMS = [
  {
    slug: 'cyber', name: 'Cybersecurity', cat: 'technology', level: "Associate & Bachelor's",
    desc: 'Learn network defense, ethical hacking, and security operations for real-world threats.', icon: 'shield',
    curriculum: [
      { code: 'CYBER 101', name: 'Introduction to Cybersecurity', credits: '3' },
      { code: 'NET 120', name: 'Networking Fundamentals', credits: '3' },
      { code: 'CYBER 210', name: 'Threats & Vulnerabilities', credits: '4' },
      { code: 'CYBER 230', name: 'Ethical Hacking', credits: '4' },
      { code: 'CYBER 299', name: 'Capstone Project', credits: '3' },
    ],
  },
  {
    slug: 'it', name: 'Information Technology', cat: 'technology', level: 'Associate & Certificate',
    desc: 'Practical skills in systems administration, networking, cloud computing, and IT support.', icon: 'server',
    curriculum: [
      { code: 'IT 100', name: 'Computer Systems Foundations', credits: '3' },
      { code: 'IT 150', name: 'Computer Systems', credits: '3' },
      { code: 'IT 210', name: 'Cloud Computing Basics', credits: '3' },
      { code: 'IT 240', name: 'IT Support & Help Desk', credits: '3' },
      { code: 'IT 299', name: 'Capstone Project', credits: '3' },
    ],
  },
  {
    slug: 'cs', name: 'Computer Science', cat: 'technology', level: "Bachelor's",
    desc: 'Programming, software engineering, databases, and applied artificial intelligence.', icon: 'code',
    curriculum: [
      { code: 'CS 101', name: 'Programming Fundamentals', credits: '4' },
      { code: 'CS 210', name: 'Data Structures', credits: '4' },
      { code: 'CS 250', name: 'Database Systems', credits: '3' },
      { code: 'CS 320', name: 'Software Engineering', credits: '4' },
      { code: 'CS 410', name: 'Applied Artificial Intelligence', credits: '4' },
    ],
  },
  {
    slug: 'business', name: 'Business', cat: 'business', level: "Associate & Bachelor's",
    desc: 'Entrepreneurship, management, finance, and modern marketing practice.', icon: 'briefcase',
    curriculum: [
      { code: 'BUS 101', name: 'Principles of Business', credits: '3' },
      { code: 'BUS 210', name: 'Financial Accounting', credits: '3' },
      { code: 'BUS 230', name: 'Marketing Fundamentals', credits: '3' },
      { code: 'BUS 310', name: 'Entrepreneurship', credits: '3' },
      { code: 'BUS 320', name: 'Management Practices', credits: '3' },
    ],
  },
  {
    slug: 'healthcare', name: 'Healthcare', cat: 'healthcare', level: 'Certificate & Associate',
    desc: 'Career-focused healthcare education for growing clinical and administrative roles.', icon: 'health',
    curriculum: [
      { code: 'HLTH 101', name: 'Intro to Healthcare Systems', credits: '3' },
      { code: 'HLTH 150', name: 'Medical Terminology', credits: '2' },
      { code: 'HLTH 210', name: 'Patient Care Fundamentals', credits: '3' },
      { code: 'HLTH 230', name: 'Health Information Systems', credits: '3' },
    ],
  },
  {
    slug: 'trades', name: 'Skilled Trades', cat: 'trades', level: 'Certificate',
    desc: 'Hands-on technical education for high-demand, high-wage skilled careers.', icon: 'wrench',
    curriculum: [
      { code: 'TRD 101', name: 'Trade Safety & Tools', credits: '2' },
      { code: 'TRD 130', name: 'Electrical Systems I', credits: '4' },
      { code: 'TRD 200', name: 'Applied Blueprint Reading', credits: '3' },
      { code: 'TRD 250', name: 'Field Practicum', credits: '4' },
    ],
  },
  {
    slug: 'media', name: 'Digital Media', cat: 'business', level: 'Associate & Certificate',
    desc: 'Design, media production, communications, and creative technology.', icon: 'media',
    curriculum: [
      { code: 'MEDA 101', name: 'Design Foundations', credits: '3' },
      { code: 'MEDA 150', name: 'Video Production I', credits: '3' },
      { code: 'MEDA 210', name: 'Digital Communications', credits: '3' },
      { code: 'MEDA 260', name: 'Media Production Capstone', credits: '3' },
    ],
  },
];

const FACULTY = [
  { name: 'Dr. Michael Johnson', dept: 'Cybersecurity Department', pos: 'Professor of Cybersecurity', edu: 'Ph.D. Information Security', tag: 'Cybersecurity' },
  { name: 'Dr. Elena Vasquez', dept: 'Computer Science Department', pos: 'Associate Professor', edu: 'Ph.D. Computer Science', tag: 'Artificial Intelligence' },
  { name: 'Prof. Daniel Okafor', dept: 'Business Department', pos: 'Professor of Management', edu: 'M.B.A., D.B.A.', tag: 'Entrepreneurship' },
  { name: 'Dr. Sarah Kim', dept: 'Health Sciences Department', pos: 'Program Director', edu: 'Ph.D. Public Health', tag: 'Clinical Operations' },
  { name: 'Prof. Marcus Bell', dept: 'Skilled Trades Department', pos: 'Lead Instructor', edu: 'M.S. Applied Technology', tag: 'Electrical Systems' },
  { name: 'Dr. Priya Nair', dept: 'Digital Media Department', pos: 'Associate Professor', edu: 'M.F.A. Design', tag: 'UX & Media Production' },
];

const JOBS = [
  { title: 'Cybersecurity Intern', company: 'Northgate Technology Partners', loc: 'Columbus, OH', pay: '$22–$28/hr', type: 'internship', desc: 'Support the security operations team with monitoring, log review, and incident response documentation under senior analyst mentorship.' },
  { title: 'Junior Network Technician', company: 'Meridian IT Solutions', loc: 'Dayton, OH', pay: '$21–$25/hr', type: 'job', desc: 'Assist with network installation, troubleshooting, and helpdesk support across client sites.' },
  { title: 'Business Operations Intern', company: 'Harborview Consulting', loc: 'Remote', pay: '$18–$22/hr', type: 'internship', desc: 'Work alongside the operations team on process improvement, reporting, and vendor coordination.' },
  { title: 'Software Developer I', company: 'Bluepeak Software', loc: 'Columbus, OH', pay: '$62,000–$74,000/yr', type: 'job', desc: 'Join a small product team building internal tooling in a modern web stack.' },
  { title: 'Digital Media Production Assistant', company: 'Fockis Technology Partner', loc: 'Columbus, OH', pay: '$19–$23/hr', type: 'internship', desc: 'Support video, photo, and social content production for a growing marketing team.' },
  { title: 'Clinical Support Apprentice', company: 'Riverside Health Group', loc: 'Springfield, OH', pay: '$20–$24/hr', type: 'apprenticeship', desc: 'Rotate through administrative and clinical-support functions while completing certification.' },
];

const NEWS = [
  { tag: 'Academics', title: 'Fockis Academy Announces New Cybersecurity Program', date: 'Aug 4, 2026' },
  { tag: 'Students', title: 'Students Complete Industry Certification Program', date: 'Jul 22, 2026' },
  { tag: 'Career', title: 'Fockis Academy Hosts Technology Career Fair', date: 'Jul 10, 2026' },
  { tag: 'Online Learning', title: 'New Online Learning Center Opens', date: 'Jun 29, 2026' },
];

const EVENTS = [
  { date: '2026-09-02', d: '02', m: 'SEP', title: 'Fall Open House', loc: 'Main Campus, 10:00 AM' },
  { date: '2026-09-15', d: '15', m: 'SEP', title: 'Technology Career Fair', loc: 'Student Union, 12:00 PM' },
  { date: '2026-09-27', d: '27', m: 'SEP', title: 'Cybersecurity Workshop', loc: 'Bldg. C — Room 210' },
  { date: '2026-10-06', d: '06', m: 'OCT', title: 'Student Orientation', loc: 'Main Auditorium' },
  { date: '2026-12-12', d: '12', m: 'DEC', title: 'Fall Commencement', loc: 'Fockis Arena, 2:00 PM' },
];

const CYBER_101_MODULES = [
  'Introduction to Cybersecurity', 'Networking Fundamentals', 'Threats & Vulnerabilities',
  'Security Controls', 'Linux Fundamentals', 'Ethical Hacking', 'Final Project',
];

// --- Generic editorial content, one array per page section ---

const CONTENT: { section: string; title: string; description?: string; meta?: Record<string, string> }[] = [
  // Home "Why Choose Fockis Academy?" (also usable anywhere else you want the same 6 cards)
  { section: 'home-why-us', title: 'Career Focused', description: 'Programs designed around real-world careers and employer demand.' },
  { section: 'home-why-us', title: 'Flexible', description: 'Online and in-person learning options built around your schedule.' },
  { section: 'home-why-us', title: 'Technology Driven', description: 'Modern technology integrated into every classroom and lab.' },
  { section: 'home-why-us', title: 'Affordable', description: 'Accessible education backed by financial assistance and payment plans.' },
  { section: 'home-why-us', title: 'Student Support', description: 'Advising, tutoring, and success resources at every step.' },
  { section: 'home-why-us', title: 'Career Connected', description: 'Internships, employer partners, and career development from day one.' },

  // Shared by the Home page (first 8) and the full Online Learning page (all 10)
  { section: 'learning-features', title: 'Online Courses' },
  { section: 'learning-features', title: 'Recorded Lectures' },
  { section: 'learning-features', title: 'Live Classes' },
  { section: 'learning-features', title: 'Assignments' },
  { section: 'learning-features', title: 'Exams' },
  { section: 'learning-features', title: 'Discussion Boards' },
  { section: 'learning-features', title: 'Digital Textbooks' },
  { section: 'learning-features', title: 'Academic Progress' },
  { section: 'learning-features', title: 'Instructor Messaging' },
  { section: 'learning-features', title: 'Virtual Classrooms' },

  // About page
  { section: 'about-pillars', title: 'Mission', description: 'To deliver accessible, career-connected education that prepares students for real employment outcomes.' },
  { section: 'about-pillars', title: 'Vision', description: "To be the region's most trusted bridge between education and industry." },
  { section: 'about-facts', title: 'Accreditation', description: 'Fockis Academy maintains institutional accreditation standards (demo content).' },
  { section: 'about-facts', title: 'Institutional History', description: 'Founded to serve a growing need for technology and workforce education.' },
  { section: 'about-facts', title: 'Strategic Plan', description: 'A multi-year plan focused on access, technology, and employer partnership.' },
  { section: 'about-leadership', title: 'Dr. Renata Pierce', description: 'President', meta: { initials: 'RP' } },
  { section: 'about-leadership', title: 'Thomas Adeyemi', description: 'Provost & VP of Academic Affairs', meta: { initials: 'TA' } },
  { section: 'about-leadership', title: 'Laura Chen', description: 'VP of Student Success', meta: { initials: 'LC' } },

  // Academics page
  { section: 'academics-categories', title: 'Associate Degrees' },
  { section: 'academics-categories', title: "Bachelor's Degrees" },
  { section: 'academics-categories', title: 'Certificates' },
  { section: 'academics-categories', title: 'Professional Certifications' },
  { section: 'academics-categories', title: 'Workforce Training' },
  { section: 'academics-categories', title: 'Online Programs' },
  { section: 'academics-categories', title: 'Continuing Education' },

  // Admissions page
  { section: 'admissions-steps', title: 'Explore Programs', description: 'Browse programs and find your career path.' },
  { section: 'admissions-steps', title: 'Submit Application', description: 'Complete the Fockis Academy online application.' },
  { section: 'admissions-steps', title: 'Complete Documents', description: 'Submit transcripts, ID, and required forms.' },
  { section: 'admissions-steps', title: 'Receive Admission Decision', description: 'Admissions reviews your application.' },
  { section: 'admissions-steps', title: 'Register for Classes', description: 'Meet your advisor and register for your first term.' },
  { section: 'admissions-faq', title: 'What do I need to apply?', description: 'A completed application, official high school transcript or GED, and a valid form of ID. Some programs require an additional program-specific form.' },
  { section: 'admissions-faq', title: 'Are there application deadlines?', description: 'Fockis Academy uses rolling admissions for most programs, with priority deadlines for financial aid and select competitive programs.' },
  { section: 'admissions-faq', title: 'Can I transfer credits?', description: 'Yes. Our transfer credit team evaluates prior college coursework and military training for potential credit.' },
  { section: 'admissions-faq', title: 'Do you accept international students?', description: 'Yes — the International Students office supports admissions, visa guidance, and orientation.' },

  // Financial Aid page
  { section: 'tuition-rates', title: 'In-State', description: 'per year, estimated', meta: { price: '$4,850' } },
  { section: 'tuition-rates', title: 'Out-of-State', description: 'per year, estimated', meta: { price: '$9,200' } },
  { section: 'tuition-rates', title: 'Online', description: 'per year, estimated', meta: { price: '$4,300' } },
  { section: 'financial-aid-options', title: 'Grants' },
  { section: 'financial-aid-options', title: 'Scholarships' },
  { section: 'financial-aid-options', title: 'Payment Plans' },
  { section: 'financial-aid-options', title: 'FAFSA & Federal Aid' },

  // Student Life page
  { section: 'student-life-items', title: 'Student Organizations', description: 'Get involved with student organizations on campus and online.' },
  { section: 'student-life-items', title: 'Clubs', description: 'Get involved with clubs on campus and online.' },
  { section: 'student-life-items', title: 'Athletics', description: 'Get involved with athletics on campus and online.' },
  { section: 'student-life-items', title: 'Campus Events', description: 'Get involved with campus events on campus and online.' },
  { section: 'student-life-items', title: 'Technology Clubs', description: 'Get involved with technology clubs on campus and online.' },
  { section: 'student-life-items', title: 'Cybersecurity Club', description: 'Get involved with the cybersecurity club on campus and online.' },
  { section: 'student-life-items', title: 'Student Government', description: 'Get involved with student government on campus and online.' },
  { section: 'student-life-items', title: 'Career Events', description: 'Get involved with career events on campus and online.' },
  { section: 'student-life-items', title: 'Volunteer Opportunities', description: 'Get involved with volunteer opportunities on campus and online.' },

  // Career Center page
  { section: 'career-services', title: 'Job Board' },
  { section: 'career-services', title: 'Internships' },
  { section: 'career-services', title: 'Career Coaching' },
  { section: 'career-services', title: 'Resume Builder' },
  { section: 'career-services', title: 'Interview Preparation' },
  { section: 'career-services', title: 'Employer Partnerships' },
  { section: 'career-services', title: 'Career Fairs' },
  { section: 'career-services', title: 'Apprenticeships' },
  { section: 'career-services', title: 'Certifications' },

  // Employers page
  { section: 'employer-benefits', title: 'Hire Students' },
  { section: 'employer-benefits', title: 'Post Internships' },
  { section: 'employer-benefits', title: 'Sponsor Programs' },
  { section: 'employer-benefits', title: 'Recruit Graduates' },
  { section: 'employer-benefits', title: 'Host Career Events' },
  { section: 'employer-benefits', title: 'Partner on Workforce Development' },

  // Library page
  { section: 'library-resources', title: 'E-books', description: 'Browse e-books available to every enrolled student.' },
  { section: 'library-resources', title: 'Research Databases', description: 'Browse research databases available to every enrolled student.' },
  { section: 'library-resources', title: 'Journals', description: 'Browse journals available to every enrolled student.' },
  { section: 'library-resources', title: 'Academic Resources', description: 'Browse academic resources available to every enrolled student.' },
  { section: 'library-resources', title: 'Citation Tools', description: 'Browse citation tools available to every enrolled student.' },
  { section: 'library-resources', title: 'Research Help', description: 'Browse research help available to every enrolled student.' },

  // Academic Calendar page
  { section: 'calendar-milestones', title: 'Registration Opens', meta: { date: 'Aug 1' } },
  { section: 'calendar-milestones', title: 'Classes Begin', meta: { date: 'Aug 25' } },
  { section: 'calendar-milestones', title: 'Last Day to Drop', meta: { date: 'Sep 8' } },
  { section: 'calendar-milestones', title: 'Midterms', meta: { date: 'Oct 13–17' } },
  { section: 'calendar-milestones', title: 'Thanksgiving Break', meta: { date: 'Nov 26–28' } },
  { section: 'calendar-milestones', title: 'Final Exams', meta: { date: 'Dec 8–12' } },
  { section: 'calendar-milestones', title: 'Semester Ends', meta: { date: 'Dec 12' } },
];

async function seedAcademy() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/fockis-academy';
  await mongoose.connect(uri);
  console.log(`Connected to ${uri}`);

  await Promise.all([
    ProgramModel.deleteMany({}),
    FacultyModel.deleteMany({}),
    JobModel.deleteMany({}),
    NewsItemModel.deleteMany({}),
    CampusEventModel.deleteMany({}),
    StudentModel.deleteMany({}),
    CourseModel.deleteMany({}),
    EnrollmentModel.deleteMany({}),
    ContentItemModel.deleteMany({}),
    // AcademyUserModel is intentionally NOT wiped here — re-running the seed
    // shouldn't destroy real admin accounts that have since been created.
  ]);

  const programs = await ProgramModel.insertMany(PROGRAMS);
  await FacultyModel.insertMany(FACULTY);
  await JobModel.insertMany(JOBS.map((j) => ({ ...j, active: true })));
  await NewsItemModel.insertMany(NEWS);
  await CampusEventModel.insertMany(EVENTS.map((e) => ({ ...e, date: new Date(e.date) })));

  const cyberProgram = programs.find((p) => p.slug === 'cyber');

  const cyber101 = await CourseModel.create({
    code: 'CYBER 101', name: 'Introduction to Cybersecurity', programId: cyberProgram?._id,
    instructor: 'Dr. Michael Johnson',
    modules: CYBER_101_MODULES.map((title, i) => ({ order: i + 1, title })),
    assignments: [
      { title: 'Module 4 Quiz: Security Controls', dueDate: new Date('2026-08-22'), status: 'upcoming' },
      { title: 'Lab 3: Firewall Configuration', dueDate: new Date('2026-08-26'), status: 'upcoming' },
      { title: 'Module 2 Quiz', dueDate: new Date('2026-08-05'), status: 'graded', gradeLabel: '94%' },
    ],
  });
  const net120 = await CourseModel.create({ code: 'NET 120', name: 'Networking Fundamentals', programId: cyberProgram?._id, instructor: 'Dr. Michael Johnson', modules: [] });
  const it150 = await CourseModel.create({ code: 'IT 150', name: 'Computer Systems', instructor: 'Prof. Marcus Bell', modules: [] });
  const eng101 = await CourseModel.create({ code: 'ENG 101', name: 'College Composition', instructor: 'Staff', modules: [] });

  const demoStudent = await StudentModel.create({
    slug: 'demo-student', name: 'Alex', email: 'alex@student.fockisacademy.edu',
    gpa: 3.6, creditsCompleted: 42, attendancePct: 96,
  });

  await EnrollmentModel.insertMany([
    { studentId: demoStudent._id, courseCode: cyber101.code, progress: 64, grade: 'A-', completedModuleOrders: [1, 2, 3, 4] },
    { studentId: demoStudent._id, courseCode: net120.code, progress: 48, grade: 'B+' },
    { studentId: demoStudent._id, courseCode: it150.code, progress: 82, grade: 'A' },
    { studentId: demoStudent._id, courseCode: eng101.code, progress: 30, grade: 'B' },
  ]);

  // Assign a stable `order` per item within each section (insertion order),
  // so the frontend's card grids render in the same order every time.
  const orderCounters: Record<string, number> = {};
  const contentWithOrder = CONTENT.map((item) => {
    const order = orderCounters[item.section] ?? 0;
    orderCounters[item.section] = order + 1;
    return { ...item, order };
  });
  await ContentItemModel.insertMany(contentWithOrder);

  // Seed one administrator account, only if none exists yet, so the admin
  // dashboard is usable immediately after seeding. Change this password
  // after first login — it's a known default, not a secret.
  const existingAdmin = await AcademyUserModel.findOne({ role: 'administrator' }).exec();
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
    await AcademyUserModel.create({
      email: 'admin@fockisacademy.edu',
      passwordHash,
      name: 'Academy Administrator',
      role: 'administrator',
    });
    console.log('  1 administrator account created: admin@fockisacademy.edu / ChangeMe123! (change this password immediately)');
  } else {
    console.log('  administrator account already exists — skipped seeding a new one');
  }

  console.log('Academy seed complete:');
  console.log(`  ${PROGRAMS.length} programs, ${FACULTY.length} faculty, ${JOBS.length} jobs`);
  console.log(`  ${NEWS.length} news items, ${EVENTS.length} events`);
  console.log('  4 courses, 1 demo student ("demo-student" / Alex), 4 enrollments');
  console.log(`  ${contentWithOrder.length} editorial content items across ${Object.keys(orderCounters).length} sections`);

  await mongoose.disconnect();
}

seedAcademy().catch((err) => {
  console.error('Academy seed failed:', err);
  process.exit(1);
});
