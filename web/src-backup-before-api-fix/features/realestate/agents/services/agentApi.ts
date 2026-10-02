const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const getToken = () => localStorage.getItem("token");

interface BackendUser {
  _id?: string;
  id?: string;
}

interface BackendAgent {
  _id: string;
  user: string | BackendUser;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  brokerage?: string;
  bio?: string;
  phone?: string;
  email?: string;
  officeAddress?: string;
  profileImage?: string;
  coverImage?: string;
  yearsExperience: number;
  specialties: string[];
  serviceAreas: string[];
  languages: string[];
  verificationStatus: "pending" | "verified" | "suspended";
  featured: boolean;
  acceptingClients: boolean;
  rating: number;
  reviewCount: number;
  totalSales: number;
  activeListings: number;
  soldListings: number;
  rentalListings: number;
}

export interface AgentProfile {
  id: string;
  userId: string;
  name: string;
  avatar?: string;
  coverImage?: string;
  company?: string;
  location?: string;
  phone?: string;
  email?: string;
  bio: string;
  verified: boolean;
  yearsExperience: number;
  activeListings: number;
  soldListings: number;
  rentalListings: number;
}

const request = async <T>(path: string): Promise<T> => {
  const token = getToken();

  const response = await fetch(`${API}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Agent API error: ${response.status}`);
  }

  return response.json();
};

const mapAgent = (agent: BackendAgent): AgentProfile => {
  const userId =
    typeof agent.user === "string"
      ? agent.user
      : agent.user?._id || agent.user?.id || "";

  return {
    id: agent._id,
    userId,
    name: `${agent.firstName} ${agent.lastName}`.trim(),
    avatar: agent.profileImage,
    coverImage: agent.coverImage,
    company: agent.brokerage,
    location: agent.officeAddress,
    phone: agent.phone,
    email: agent.email,
    bio: agent.bio || "",
    verified: agent.verificationStatus === "verified",
    yearsExperience: agent.yearsExperience || 0,
    activeListings: agent.activeListings || 0,
    soldListings: agent.soldListings || 0,
    rentalListings: agent.rentalListings || 0,
  };
};

export const agentApi = {
  async getAgent(id: string): Promise<AgentProfile> {
    const agent = await request<BackendAgent>(`/realestate/agents/${id}`);
    return mapAgent(agent);
  },
};