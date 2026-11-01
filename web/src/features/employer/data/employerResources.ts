import type { EmployerJobType } from '../types';

/** Editorial content for the Resources page (static, maintained in code). */

export interface ResourceArticle {
  id: string;
  title: string;
  summary: string;
  sections: { heading: string; points: string[] }[];
}

export interface JobTemplate {
  id: string;
  title: string;
  type: EmployerJobType;
  summary: string;
  skills: string[];
  benefits: string[];
  description: string;
}

export const HIRING_GUIDES: ResourceArticle[] = [
  {
    id: 'hiring-guide',
    title: 'Hiring Guide',
    summary: 'Best practices for finding and hiring talent.',
    sections: [
      {
        heading: 'Before you post',
        points: [
          'Agree on the outcomes the role must deliver in its first 6–12 months.',
          'Separate must-have skills from nice-to-haves — long requirement lists discourage strong applicants.',
          'Decide the salary range up front. Listings with pay ranges receive more qualified applications.',
        ],
      },
      {
        heading: 'Screening applicants',
        points: [
          'Review new applications within a few days; top candidates move quickly.',
          'Use the same criteria for every applicant and note your reasoning in recruiter notes.',
          'Shortlist generously, then narrow down with a short phone screen.',
        ],
      },
      {
        heading: 'Making the decision',
        points: [
          'Collect structured feedback from every interviewer before discussing as a group.',
          'Check references for the final one or two candidates.',
          'Let every interviewed candidate know the outcome, including rejections.',
        ],
      },
    ],
  },
  {
    id: 'interview-toolkit',
    title: 'Interview Toolkit',
    summary: 'Questions, scorecards, and evaluation tips.',
    sections: [
      {
        heading: 'Structured interview questions',
        points: [
          'Tell me about a project you are proud of. What was your specific contribution?',
          'Describe a time you disagreed with a teammate. How did you resolve it?',
          'Walk me through how you would approach [a real problem from this role].',
          'What would you want to learn or achieve in your first 90 days here?',
        ],
      },
      {
        heading: 'Scorecard',
        points: [
          'Rate each competency 1–5 with one sentence of evidence.',
          'Use the Fockis feedback form after each interview — it records rating and recommendation.',
          'Avoid discussing candidates with other interviewers until everyone has submitted feedback.',
        ],
      },
      {
        heading: 'Running the interview',
        points: [
          'Share the agenda and the interviewers’ names in advance.',
          'Leave 10 minutes for the candidate’s questions.',
          'Explain the next steps and timeline before you finish.',
        ],
      },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance & Policies',
    summary: 'Hiring, EEO, and workplace compliance basics.',
    sections: [
      {
        heading: 'Fair and inclusive hiring',
        points: [
          'Don’t ask about age, religion, marital status, pregnancy, disability, national origin or other protected characteristics.',
          'Use inclusive language in job titles and descriptions.',
          'Offer reasonable accommodations during the interview process when asked.',
        ],
      },
      {
        heading: 'Candidate data',
        points: [
          'Use applicant information only for the hiring process.',
          'Limit Employer Center access to people involved in hiring — manage this in Team Management.',
          'Remove team members as soon as they no longer need access.',
        ],
      },
      {
        heading: 'Fockis listing rules',
        points: [
          'Listings must describe a real, open position.',
          'Never ask candidates to pay a fee to apply or be hired.',
          'External application links must lead to your organization’s own application page.',
        ],
      },
    ],
  },
];

export const RECRUITMENT_TIPS: ResourceArticle = {
  id: 'tips',
  title: 'Recruitment Tips',
  summary: 'Short, practical ideas to improve your listings and response times.',
  sections: [
    {
      heading: 'Better listings',
      points: [
        'Lead with the impact of the role, not the company history.',
        'Keep the description scannable: short paragraphs and bullet points.',
        'Add 5–10 specific skills so candidates can find your job in search.',
      ],
    },
    {
      heading: 'Better pipeline',
      points: [
        'Check the Applications page daily and move candidates out of “New”.',
        'Use bulk actions to shortlist or reject several applicants at once.',
        'Save promising candidates so you can find them again for future roles.',
      ],
    },
  ],
};

export const JOB_TEMPLATES: JobTemplate[] = [
  {
    id: 'software-engineer',
    title: 'Software Engineer',
    type: 'job',
    summary: 'Full-time engineering role.',
    skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git'],
    benefits: ['Health insurance', 'Paid time off', 'Learning budget'],
    description: `About the role
We are looking for a Software Engineer to design, build and maintain features used by our customers every day. You will work closely with product and design and own work from idea to production.

What you will do
• Build and ship reliable features across the front end and back end
• Write clean, tested and well-documented code
• Review code and help teammates grow
• Investigate and fix production issues

What we are looking for
• 2+ years of professional software development experience
• Strong JavaScript/TypeScript skills
• Experience with a modern front-end framework (e.g. React)
• Clear written and verbal communication

Nice to have
• Experience with cloud platforms and CI/CD
• Familiarity with SQL and NoSQL databases`,
  },
  {
    id: 'customer-support',
    title: 'Customer Support Representative',
    type: 'job',
    summary: 'Front-line customer support role.',
    skills: ['Customer service', 'Communication', 'Problem solving', 'Zendesk'],
    benefits: ['Health insurance', 'Paid time off'],
    description: `About the role
As a Customer Support Representative you will be the first point of contact for our customers, helping them solve problems quickly and kindly.

What you will do
• Answer customer questions by chat, email and phone
• Troubleshoot issues and escalate when needed
• Record feedback to help improve our products
• Keep help-center articles up to date

What we are looking for
• 1+ year in a customer-facing role
• Excellent written and spoken communication
• Patience, empathy and attention to detail
• Comfortable learning new tools`,
  },
  {
    id: 'marketing-intern',
    title: 'Marketing Intern',
    type: 'internship',
    summary: 'Paid internship for students.',
    skills: ['Social media', 'Copywriting', 'Canva', 'Analytics'],
    benefits: ['Mentorship', 'Flexible hours'],
    description: `About the internship
Join our marketing team for a hands-on internship. You will help plan and publish campaigns and learn how we measure what works.

What you will do
• Draft social media posts and newsletter content
• Help organize campaigns and events
• Track campaign results and share insights
• Research competitors and trends

Who we are looking for
• Currently enrolled in a degree program (marketing, communications or related)
• Strong writing skills
• Curious, organized and eager to learn`,
  },
];
