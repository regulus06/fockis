const en = {
  common: {
    language: "Language",
    english: "English",
    haitianCreole: "Haitian Creole",
    french: "French",
    spanish: "Spanish",
    search: "Search",
    clear: "Clear",
    cancel: "Cancel",
    save: "Save",
    continue: "Continue",
    back: "Back",
    next: "Next",
    loading: "Loading...",
    submit: "Submit",
    close: "Close",
    yes: "Yes",
    no: "No",
    country: "Country",
    countries: "Countries",
  },

  register: {
    heroTitle: "One account. One ecosystem. Endless possibilities.",
    heroHeading: "Create your Fockis account.",
    heroDescription:
      "One account connects your social experience, marketplace activity, real-estate opportunities, career journey, and academic experience.",

    exploreFockis: "Explore Fockis",
    social: "Social",
    marketplace: "Marketplace",
    realEstate: "Real Estate",
    careers: "Careers",
    academy: "Academy",

    connectedTitle: "One Fockis account. One connected experience.",
    connectedDescription:
      "Join once and get access to Social, Marketplace, Real Estate, Careers, and Academy — no separate sign-ups required.",

    createAccount: "Create account",
    joinFockis: "Join Fockis",
    joinDescription: "Join Fockis and create your profile.",

    firstName: "First name",
    lastName: "Last name",
    username: "Username",
    email: "Email",

    firstNamePlaceholder: "Enter your first name",
    lastNamePlaceholder: "Enter your last name",
    usernamePlaceholder: "Choose a username",
    emailPlaceholder: "Enter your email address",

    country: "Country",
    searchCountry: "Search country...",
    searchCountries: "Search countries",
    clearCountrySearch: "Clear country search",

    selectMatchingCountry: "Select a matching country",
    selectYourCountry: "Select your country",

    countryFound: "{{count}} country found",
    countriesFound: "{{count}} countries found",

    callingCode: "Calling code:",

    password: "Password",
    confirmPassword: "Confirm password",
    passwordPlaceholder: "Create a password",
    confirmPasswordPlaceholder: "Confirm your password",

    hidePassword: "Hide password",
    showPassword: "Show password",

    passwordRequirements:
      "At least 12 characters with uppercase, lowercase, number, and special character.",

    fockisIdentity: "Your Fockis identity",
    identityDescription:
      "Your country will be connected to your Fockis ID.",
    identityExample: "Example: +509-FK7H2K9A",
    identityPhoneNote:
      "You do not need a phone number to create your Fockis ID.",

    createAccountButton: "Create Account",
    creatingAccount: "Creating Account...",

    alreadyHaveAccount: "Already have an account?",
    login: "Login",

    alerts: {
      requiredFields: "Please complete all required fields.",
      selectCountry: "Please select your country.",
      passwordsDoNotMatch: "Passwords do not match.",
      passwordTooShort:
        "Your password must be at least 12 characters long.",
      passwordUppercase:
        "Your password must contain at least one uppercase letter.",
      passwordLowercase:
        "Your password must contain at least one lowercase letter.",
      passwordNumber:
        "Your password must contain at least one number.",
      passwordSpecial:
        "Your password must contain at least one special character.",
      success:
        "Your Fockis account was created successfully for {{country}}.",
      registrationFailed:
        "We could not create your account. Please try again.",
      networkError:
        "Unable to connect to Fockis. Please check your connection and try again.",
    },
  },

  login: {
    heroEyebrow:
      "One account. One ecosystem. Endless possibilities.",

    welcomeBack: "Welcome back.",

    heroDescription:
      "Sign in to connect with your community, marketplace, career opportunities, real estate, and academic journey — all in one place.",

    exploreFockis: "Explore Fockis",

    social: "Social",
    marketplace: "Marketplace",
    realEstate: "Real Estate",
    careers: "Careers",
    academy: "Academy",

    connectedTitle:
      "One Fockis account. One connected experience.",

    connectedDescription:
      "Your account connects your social experience, marketplace activity, real-estate opportunities, career journey, and academic experience.",

    signInToFockis: "Sign in to Fockis",

    formDescription:
      "Access your feed, marketplace, career opportunities, and more.",

    email: "Email",
    emailPlaceholder: "Enter your email address",

    password: "Password",
    passwordPlaceholder: "Enter your password",

    showPassword: "Show password",
    hidePassword: "Hide password",

    forgotPassword: "Forgot password?",

    signIn: "Sign In",
    signingIn: "Signing you in…",

    noAccount: "No account?",
    register: "Register",

    alerts: {
      invalidCredentials:
        "Invalid email or password.",

      checkCredentials:
        "Please check your email and password.",

      connectionError:
        "Unable to connect to the Fockis API.",

      backendJwtError:
        "Backend did not return JWT token.",

      backendUserError:
        "Backend did not return user information.",

      userIdError:
        "User ID missing from backend response.",
    },
  },

  church: {
    navigation: {
      home: "Home",
      organizations: "Organizations",
      myChurch: "My Church",
      planVisit: "Plan a Visit",

      overview: "Overview",
      leadership: "Leadership",
      branches: "Branches",
      members: "Members",
      departments: "Departments",
      groups: "Groups",
      events: "Events",
      live: "Live",
      attendance: "Attendance",
      communication: "Communication",
      media: "Media",

      churchMenu: "Church Menu",
      myOrganization: "My Organization",

      admin: "Admin",
      administration: "Church Administration",
      dashboard: "Dashboard",
      createOrganization: "Create Organization",
      manageMembers: "Manage Members",
      manageDepartments: "Manage Departments",
      manageGroups: "Manage Groups",
      manageEvents: "Manage Events",
      livestreamManager: "Livestream Manager",
      settings: "Church Settings",

      closeMenu: "Close menu",
      openMenu: "Open menu",
      primaryMobile: "Primary mobile",
      organizationNavigation: "Organization navigation",

      myProfile: "My Profile",
      myEvents: "My Events",
      myAttendance: "My Attendance",
      messages: "Messages",
      notifications: "Notifications",
      signOut: "Sign Out",
      accountMenu: "Account menu",
    },

    search: {
      organizationsEventsMembers:
        "Search organizations, events, members…",
      mobile: "Search…",
      ariaLabel: "Search Fockis Church",
    },

    notifications: {
      title: "Notifications",
      empty: "You're all caught up.",
      viewAll: "View all notifications",
      ariaLabel: "Notifications",
    },

    organization: {
      invalidId:
        "This organization does not have a valid organization ID.",
      noOrganization:
        "No organization was selected.",
    },

    event: {
      hostedBy: "Hosted by",
      online: "Online",

      going: "Going",
      interested: "Interested",
      cantGo: "Can't go",
      noResponse: "No response",

      youreGoing: "You're going",
      eventFull: "Event full",
      imGoing: "I'm going",

      types: {
        church_service: "Church Service",
        department_event: "Department Event",
        meeting: "Meeting",
        bible_study: "Bible Study",
        special_event: "Special Event",
      },
    },

    group: {
      view: "View group",
      leave: "Leave group",
      join: "Join group",
      full: "Group full",

      types: {
        bible_study: "Bible Study",
        small_group: "Small Group",
        prayer_group: "Prayer Group",
        custom: "Custom Group",
      },
    },

    department: {
      ledBy: "Led by",
      leave: "Leave department",
      join: "Join department",

      types: {
        men: "Men",
        women: "Women",
        youth: "Youth",
        children: "Children",
        music_choir: "Music / Choir",
        prayer: "Prayer",
        custom: "Custom",
      },
    },

    members: {
      one: "{{count}} member",
      many: "{{count}} members",

      you: "You",
      email: "Email",
      phone: "Phone",
      memberSince: "Member since",
      privateDetails: "Contact details are private.",

      status: {
        pending: "Pending",
        active: "Active",
        inactive: "Inactive",
        archived: "Archived",
      },

      roles: {
        administrator: "Administrator",
        pastor_director: "Pastor / Director",
        leader: "Leader",
        department_manager: "Department Manager",
        group_leader: "Group Leader",
        member: "Member",
        guest: "Guest",
      },
    },

    organizationCard: {
      view: "View organization",
      pending: "Request pending",
      rejoin: "Rejoin",
      requestJoin: "Request to join",
      sending: "Sending request…",

      oneMember: "{{count}} member",
      manyMembers: "{{count}} members",
    },

    createGroup: {
      eyebrow: "Fockis Church",
      title: "Create a group",
      description:
        "Create a Bible study, small group, prayer group, or custom group for your organization.",

      groupInformation: "Group information",
      groupInformationHint:
        "Give your group a name and choose the type that best describes it.",

      groupName: "Group name",
      groupNameRequired: "Group name *",
      groupNamePlaceholder:
        "Example: Wednesday Bible Study",

      groupType: "Group type",
      groupTypeRequired: "Group type *",

      descriptionLabel: "Description",
      descriptionPlaceholder:
        "Tell members what this group is about...",

      groupPhotoUrl: "Group photo URL",
      groupPhotoUrlPlaceholder:
        "https://example.com/group.jpg",

      groupDetails: "Group details",

      departmentId: "Department ID",
      departmentIdPlaceholder:
        "Optional department ID",
      departmentHint:
        "Leave blank if this group does not belong to a department.",

      meetingSchedule: "Meeting schedule",
      meetingSchedulePlaceholder:
        "Every Wednesday at 7:00 PM",

      meetingLocation: "Meeting location",
      meetingLocationPlaceholder:
        "Room 204 / Fellowship Hall / Online",

      capacity: "Capacity",
      capacityOptional: "Optional",
      capacityHint:
        "Leave blank for unlimited capacity.",

      cancel: "Cancel",
      creating: "Creating…",
      create: "Create group",

      errors: {
        generic:
          "Something went wrong. Please try again.",
        organizationId:
          "A valid organization ID is required.",
        groupName:
          "Group name is required.",
        capacity:
          "Capacity must be a whole number greater than 0.",
      },

      success:
        "Group created successfully.",
    },

    organizationTypes: {
      church: "Church",
      christian_church: "Christian Church",
      christian_ministry: "Christian Ministry",
      christian_fellowship: "Christian Fellowship",
      mission: "Mission",
      prayer_organization: "Prayer Organization",
      christian_network: "Christian Network",
      christian_nonprofit: "Christian Nonprofit",
      bible_study_organization: "Bible Study Organization",

      mosque: "Mosque",
      islamic_organization: "Islamic Organization",
      synagogue: "Synagogue",
      jewish_organization: "Jewish Organization",
      temple: "Temple",
      religious_organization: "Religious Organization",
      religious_institution: "Religious Institution",
      faith_organization: "Faith Organization",

      school: "School",
      elementary_school: "Elementary School",
      middle_school: "Middle School",
      high_school: "High School",
      private_school: "Private School",
      public_school: "Public School",
      charter_school: "Charter School",
      college: "College",
      university: "University",
      community_college: "Community College",
      vocational_school: "Vocational School",
      technical_school: "Technical School",
      trade_school: "Trade School",
      academy: "Academy",
      training_institute: "Training Institute",
      training_organization: "Training Organization",
      educational_organization: "Educational Organization",
      educational_institution: "Educational Institution",
      student_organization: "Student Organization",
      education_organization: "Education Organization",
      institute: "Institute",

      political_organization: "Political Organization",
      political_party: "Political Party",
      civic_organization: "Civic Organization",
      advocacy_organization: "Advocacy Organization",
      government_organization: "Government Organization",
      public_affairs_organization: "Public Affairs Organization",
      community_action_organization:
        "Community Action Organization",

      social_organization: "Social Organization",
      community_organization: "Community Organization",
      community_group: "Community Group",
      neighborhood_organization:
        "Neighborhood Organization",
      support_group: "Support Group",

      nonprofit: "Nonprofit",
      nonprofit_organization: "Nonprofit Organization",
      charity: "Charity",
      foundation: "Foundation",
      humanitarian_organization:
        "Humanitarian Organization",
      relief_organization: "Relief Organization",
      volunteer_organization:
        "Volunteer Organization",

      business: "Business",
      company: "Company",
      professional_organization:
        "Professional Organization",
      professional_association:
        "Professional Association",
      trade_association: "Trade Association",
      industry_association:
        "Industry Association",
      business_association:
        "Business Association",

      sports_club: "Sports Club",
      sports_organization: "Sports Organization",
      sports_league: "Sports League",
      athletic_team: "Athletic Team",
      athletic_organization:
        "Athletic Organization",
      recreation_organization:
        "Recreation Organization",
      fitness_organization:
        "Fitness Organization",

      arts_organization: "Arts Organization",
      cultural_organization:
        "Cultural Organization",
      music_organization: "Music Organization",
      theater_organization:
        "Theater Organization",
      theatre_organization:
        "Theatre Organization",
      dance_organization: "Dance Organization",
      creative_organization:
        "Creative Organization",
      performing_arts_organization:
        "Performing Arts Organization",

      health_organization: "Health Organization",
      healthcare_organization:
        "Healthcare Organization",
      medical_organization:
        "Medical Organization",
      wellness_organization:
        "Wellness Organization",
      mental_health_organization:
        "Mental Health Organization",

      youth_organization: "Youth Organization",
      family_organization: "Family Organization",
      childrens_organization:
        "Children's Organization",
      children_organization:
        "Children Organization",
      parent_organization:
        "Parent Organization",

      club: "Club",
      association: "Association",
      society: "Society",
      alumni_organization:
        "Alumni Organization",
      alumni_association:
        "Alumni Association",

      technology_organization:
        "Technology Organization",
      technology_group: "Technology Group",
      developer_organization:
        "Developer Organization",
      software_organization:
        "Software Organization",
      innovation_organization:
        "Innovation Organization",
      startup_organization:
        "Startup Organization",

      environmental_organization:
        "Environmental Organization",
      environment_organization:
        "Environment Organization",
      conservation_organization:
        "Conservation Organization",
      climate_organization:
        "Climate Organization",

      other: "Other",
    },

    home: {
      brand: "FOCKIS",
      tagline: "Organizations & Communities",
      navigation: "Navigation",

      nav: {
        home: "Home",
        organizations: "Organizations",
        myOrganizations: "My Organizations",
      },

      createOrganization: "Create Organization",
      browseOrganizations: "Browse Organizations",

      identity: {
        eyebrow: "ORGANIZATION IDENTITY",
        title: "Build your organization identity",
        description:
          "Create and manage the official identity, presence, and information for your organization on Fockis.",
        manage:
          "Manage your organization identity →",
      },

      hero: {
        eyebrow: "FOCKIS ORGANIZATIONS",
        title: "One platform for",
        titleStrong:
          "every organization and community.",
        description:
          "Discover organizations, build communities, manage members, host events, share media, and connect people through one Fockis experience.",
      },

      discovery: {
        eyebrow: "DISCOVER",
        title:
          "Find organizations that matter to you.",
        viewAll: "View all organizations",
        searchTitle: "Search organizations",
        searchDescription:
          "Find churches, schools, nonprofits, businesses, community groups, sports organizations, and more.",
      },

      organizationTypes: {
        faithReligion: {
          title: "Faith & Religion",
          description:
            "Churches, ministries, religious organizations, fellowships, and faith communities.",
          categories:
            "Churches · Ministries · Mosques · Synagogues · Temples · Faith Organizations",
        },

        education: {
          title: "Education",
          description:
            "Schools, colleges, universities, academies, training organizations, and educational institutions.",
          categories:
            "Schools · Colleges · Universities · Academies · Training · Education",
        },

        nonprofitCharity: {
          title: "Nonprofit & Charity",
          description:
            "Nonprofits, charities, foundations, humanitarian organizations, and volunteer organizations.",
          categories:
            "Nonprofits · Charities · Foundations · Humanitarian · Volunteer",
        },

        governmentCivic: {
          title: "Government & Civic",
          description:
            "Government organizations, civic groups, public affairs organizations, and community action organizations.",
          categories:
            "Government · Civic · Public Affairs · Community Action",
        },

        politicalAdvocacy: {
          title: "Political & Advocacy",
          description:
            "Political organizations, political parties, advocacy organizations, and public-interest communities.",
          categories:
            "Political Organizations · Political Parties · Advocacy",
        },

        businessProfessional: {
          title: "Business & Professional",
          description:
            "Businesses, companies, professional organizations, trade associations, and industry groups.",
          categories:
            "Businesses · Companies · Professional · Trade · Industry",
        },

        sportsRecreation: {
          title: "Sports & Recreation",
          description:
            "Sports clubs, athletic teams, leagues, recreation organizations, and fitness communities.",
          categories:
            "Sports Clubs · Teams · Leagues · Recreation · Fitness",
        },

        artsCultureMedia: {
          title: "Arts, Culture & Media",
          description:
            "Arts, cultural, music, theater, dance, creative, and performing arts organizations.",
          categories:
            "Arts · Culture · Music · Theater · Dance · Creative",
        },

        communitySocial: {
          title: "Community & Social",
          description:
            "Community organizations, neighborhood groups, support groups, social organizations, and clubs.",
          categories:
            "Community · Neighborhood · Support · Social · Clubs",
        },

        technology: {
          title: "Technology",
          description:
            "Technology organizations, developer communities, software groups, startups, and innovation organizations.",
          categories:
            "Technology · Developers · Software · Innovation · Startups",
        },

        international: {
          title: "International",
          description:
            "Organizations and communities that connect people across countries and cultures.",
          categories:
            "Global Communities · International Organizations · Cross-Border",
        },

        other: {
          title: "Other",
          description:
            "Create a home for organizations and communities that do not fit another category.",
          categories:
            "Clubs · Associations · Societies · Other Organizations",
        },
      },

      platform: {
        eyebrow: "THE FOCKIS ORGANIZATION PLATFORM",
        title:
          "Everything your organization needs in one place.",
        description:
          "Fockis gives organizations the tools to build their presence, manage their communities, communicate with members, and grow.",
      },

      features: {
        discover: {
          title: "Be discovered",
          description:
            "Create a public organization presence that people can discover and explore.",
        },

        members: {
          title: "Manage members",
          description:
            "Organize memberships, roles, statuses, and member relationships.",
        },

        groups: {
          title: "Build groups",
          description:
            "Create departments, groups, Bible studies, teams, and communities.",
        },

        events: {
          title: "Host events",
          description:
            "Create and manage services, meetings, gatherings, and special events.",
        },

        communication: {
          title: "Stay connected",
          description:
            "Communicate with your members and keep your organization connected.",
        },

        mediaLive: {
          title: "Media & Live",
          description:
            "Share media and connect your organization with live experiences.",
        },

        organizationTools: {
          title: "Organization tools",
          description:
            "Build a structured digital home for the way your organization operates.",
        },

        administration: {
          title: "Administration",
          description:
            "Manage your organization with role-based administrative tools.",
        },
      },

      myOrganizations: {
        eyebrow: "YOUR ORGANIZATIONS",
        title: "Your organizations.",
        titleSecond: "Your communities.",
        description:
          "Access the organizations you belong to and manage the communities you help lead.",
        open: "Open organization",
      },

      admin: {
        eyebrow: "ORGANIZATION ADMINISTRATION",
        title: "Manage your organization.",
        description:
          "Access members, departments, groups, events, livestreams, settings, and other organization tools.",
        open: "Open administration",
      },

      create: {
        eyebrow: "GET STARTED",
        title: "Create your organization.",
        description:
          "Give your organization a home on Fockis and start building your community.",
      },

      footer: {
        description:
          "Fockis Organizations connects people with churches, schools, businesses, nonprofits, communities, and organizations around the world.",
        organizations: "Organizations",
        discover: "Discover",
      },
    },

    events: {
      title: "Events",
      description:
        "Discover and manage events for this organization.",
      create: "Create event",
      timeframe: "Timeframe",
      upcoming: "Upcoming",
      past: "Past",
      filterByType: "Filter by type",
      allTypes: "All event types",
      loading: "Loading events...",
      empty: "No events found.",
      createFirst: "Create the first event",

      errors: {
        validOrganization:
          "A valid organization ID is required.",
        placeholderOrganizationId:
          "A real organization ID is required. The placeholder ID is not allowed.",
        load:
          "Unable to load events. Please try again.",
        rsvp:
          "Unable to update your RSVP. Please try again.",
        cancelRsvp:
          "Unable to cancel your RSVP. Please try again.",
      },
    },

    groups: {
      eyebrow: "FOCKIS ORGANIZATIONS",
      title: "Groups & Communities",
      description:
        "Discover and participate in groups connected to this organization.",

      available: "Available groups",
      filtered: "Filtered groups",
      all: "All groups",
      directoryView: "Directory view",
      create: "Create group",
      findCommunity: "Find your community",
      browse: "Browse groups",

      clearFilters: "Clear filters",
      search: "Search",
      searchPlaceholder: "Search groups...",
      searchAriaLabel: "Search organization groups",

      groupType: "Group type",
      filterByType: "Filter by type",
      allGroupTypes: "All group types",

      authenticationRequired:
        "Authentication required",
      accessDenied: "Access denied",
      unableToLoad: "Unable to load groups.",
      signIn: "Sign in",
      backToOrganization:
        "Back to organization",

      activeCommunities: "Active communities",
      matchingGroups: "matching groups",
      organizationGroups:
        "Organization groups",

      groupCount: {
        one: "{{count}} group",
        many: "{{count}} groups",
      },

      informationUnavailable:
        "Information unavailable",

      informationUnavailableDescription:
        "We could not load the information for this group.",

      noGroupsFound: "No groups found",
      noGroupsYet: "No groups yet",

      tryChangingFilters:
        "Try changing your search or filters.",

      noGroupsDescription:
        "This organization has not created any groups yet.",

      createFirst: "Create the first group",

      errors: {
        organization:
          "A valid organization is required.",
        signInToView:
          "Please sign in to view organization groups.",
        activeMemberToView:
          "You must be an active member to view these groups.",
        sessionExpired:
          "Your session has expired. Please sign in again.",
        activeMemberToJoin:
          "You must be an active member to join this group.",
        activeMemberToLeave:
          "You must be an active member to leave this group.",
      },
    },
  },
} as const;

export default en;