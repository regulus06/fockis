import type { CareerResource } from '../types';

/** Editorial career guidance shown on Fockis Careers (maintained in code). */
export const CAREER_RESOURCES: CareerResource[] = [
  {
    id: 'resume',
    category: 'resume',
    title: 'Resume Builder Guide',
    summary: 'Create a professional resume that gets interviews.',
    sections: [
      {
        heading: 'Structure',
        points: [
          'Keep it to one page early in your career, two pages at most later.',
          'Order: contact details, short summary, experience, education, skills, certifications.',
          'Use a clean, single-column layout — applicant tracking systems read it more reliably.',
        ],
      },
      {
        heading: 'Writing strong bullet points',
        points: [
          'Start with an action verb: built, led, reduced, resolved, launched.',
          'Show results with numbers where you can (e.g. “resolved 40+ tickets a week”).',
          'Tailor the top bullets to the job description you are applying for.',
        ],
      },
      {
        heading: 'Before you send it',
        points: [
          'Export as PDF and name the file “Firstname_Lastname_Resume.pdf”.',
          'Proofread twice and ask someone else to read it once.',
          'Upload it to your Fockis career profile so you can apply in one step.',
        ],
      },
    ],
  },
  {
    id: 'interview',
    category: 'interview',
    title: 'Interview Tips',
    summary: 'Prepare and practice for interviews.',
    sections: [
      {
        heading: 'Prepare',
        points: [
          'Research the company, its products and the team you would join.',
          'Re-read the job description and map each requirement to an example from your experience.',
          'Prepare 3–4 questions to ask the interviewer.',
        ],
      },
      {
        heading: 'Answer with STAR',
        points: [
          'Situation — set the scene briefly.',
          'Task — what you were responsible for.',
          'Action — what you did, specifically.',
          'Result — the outcome, ideally measurable.',
        ],
      },
      {
        heading: 'Video interviews',
        points: [
          'Test your camera, microphone and the meeting link 15 minutes early.',
          'Use a quiet, well-lit space and look at the camera when you speak.',
          'Keep a copy of your resume and notes nearby.',
        ],
      },
    ],
  },
  {
    id: 'guides',
    category: 'advice',
    title: 'Career Guides',
    summary: 'Career growth, skills, and job search tips.',
    sections: [
      {
        heading: 'Plan your next step',
        points: [
          'Write down the role you want in 2–3 years and the skills it requires.',
          'Compare those skills with your profile and pick one gap to close each quarter.',
          'Ask for feedback regularly from managers, mentors and peers.',
        ],
      },
      {
        heading: 'Build your network',
        points: [
          'Keep your Fockis career profile and LinkedIn up to date.',
          'Reach out to people in roles you admire — ask about their path, not for a job.',
          'Join communities and events in your field.',
        ],
      },
    ],
  },
  {
    id: 'certifications',
    category: 'certifications',
    title: 'Certifications',
    summary: 'Explore certifications that boost your profile.',
    sections: [
      {
        heading: 'IT and cybersecurity',
        points: [
          'CompTIA A+, Network+ and Security+ are common entry points for IT support and security roles.',
          'Cisco CCNA covers networking fundamentals in depth.',
          'Cloud certifications (AWS, Azure, Google Cloud) help for cloud and DevOps roles.',
        ],
      },
      {
        heading: 'Choosing a certification',
        points: [
          'Check which certifications appear most in job listings you want.',
          'Prefer vendor-neutral certifications early, specialized ones later.',
          'Add certifications in progress to your profile — employers value the effort.',
        ],
      },
    ],
  },
  {
    id: 'search',
    category: 'search',
    title: 'Job Search Tips',
    summary: 'Search smarter and stay organized.',
    sections: [
      {
        heading: 'Search smarter',
        points: [
          'Use filters for job type, experience level, salary and remote work.',
          'Create job alerts so new matching jobs show up in your Careers overview.',
          'Save interesting jobs and compare them before you apply.',
        ],
      },
      {
        heading: 'Stay organized',
        points: [
          'Track every application on your My Applications page.',
          'Follow up politely one week after an interview if you have not heard back.',
          'Apply consistently — a few tailored applications a week beats many generic ones.',
        ],
      },
    ],
  },
];

export const resourceById = (id: string) => CAREER_RESOURCES.find((item) => item.id === id);
