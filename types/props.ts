import React from 'react';
import { Animated } from 'react-native';

export interface AddTaskModalProps {
    visible: boolean;
    onClose: () => void;
    onAddTask: (task: {
        title: string;
        description: string;
        deadline?: Date | null;
        id?: string;
    }) => void;
    task?: {
        id?: string;
        title: string;
        description: string;
        deadline?: Date | null;
    };
}

export interface AddBookModalProps {
    visible: boolean;
    onClose: () => void;
    onAdd: () => void;
    newBook: any;
    setNewBook: (book: any) => void;
    pickImage: () => void;
    starTemp: number;
    setRating: (star: number) => void;
}

export interface AddFolderModalProps {
    visible: boolean;
    onClose: () => void;
    onAddFolder: (folder: { title: string; description: string }) => void;
    folder?: { title: string; description: string };
}

export interface AddNoteModalProps {
    visible: boolean;
    onClose: () => void;
    onAddNote: (note: {
        title: string;
        description: string;
        date: string;
    }) => void;
    note?: {
        title: string;
        description: string;
        date: string;
    };
}

export interface Book {
    id: string;
    title: string;
    description: string;
    coverUri: string | null;
    rating: number;
    favorite: boolean;
    userId: string;
}

export interface BookDetailModalProps {
    visible: boolean;
    book: Book | null;
    onClose: () => void;
    renderStars: (count: number, size?: number) => React.ReactNode;
}

export interface PomodoroTimerModalProps {
    visible: boolean;
    onClose: () => void;
}

export interface AddScheduleModalProps {
    visible: boolean;
    fadeAnim: Animated.Value;
    subject: string;
    setSubject: (s: string) => void;
    selectedDate: string;
    setSelectedDate: (d: string) => void;
    time: string;
    showTimePickerHandler: () => void;
    onClose: () => void;
    onSubmit: (encryptedData?: any) => void;
    isLoading: boolean;
    editing: boolean;
}

export interface Note {
    title: string;
    description: string;
    date: string;
}

export interface FolderDetailsModalProps {
    visible: boolean;
    folder: {
        id?: string;
        title: string;
        description: string;
        notes?: Note[];
    } | null;
    onClose: () => void;
    onAddNote: (note: Note) => void;
}

export interface Schedule {
    id?: string;
    subject: string;
    time: string;
    date: string;
    userId: string;
    createdAt: any;
}

export interface Expense {
    id: string;
    amount: number;
    category: string;
    description: string;
    date: Date;
    type: "expense" | "income";
    userId?: string;
}

export interface Category {
    id: string;
    name: string;
    color: string;
    budget: number;
    icon: string;
    userId?: string;
}

export interface Budget {
    totalBudget: number;
    totalSpent: number;
    monthlyBudget: number;
}

export interface Debt {
    id: string;
    personName: string;
    amount: number;
    description: string;
    type: "owed_to_me" | "i_owe";
    status: "active" | "settled";
    userId: string;
    date: Date;
    settledDate: Date | undefined;
}

export type FilterPeriod = "week" | "month" | "year" | "all";
