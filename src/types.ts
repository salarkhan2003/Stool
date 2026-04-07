export type OutreachStatus = 'To Research' | 'Contacted' | 'Feedback Given' | 'Finished';
export type Priority = 'Low' | 'Medium' | 'High';

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface OutreachItem {
  id: string;
  title: string;
  phone_number: string;
  email: string;
  current_status: OutreachStatus;
  priority: Priority;
  category: string;
  next_follow_up?: string;
  notes: string;
  feedback_log: string[];
  sub_tasks: SubTask[];
  lastCallTimestamp?: string;
}

export interface OutreachList {
  id: string;
  name: string;
  createdAt: string;
  items: OutreachItem[];
}

export interface Thought {
  id: string;
  content: string;
  timestamp: string;
  was_i_right: boolean | null;
}

export interface AppData {
  thoughts: Thought[];
  lists: OutreachList[];
}
