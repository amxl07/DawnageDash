export interface Question {
    id: string;
    text: string;
    type: 'text' | 'number' | 'select' | 'radio' | 'textarea' | 'multiselect';
    options?: string[];
    placeholder?: string;
    required?: boolean;
    step?: string;
    min?: number;
    max?: number;
}

export interface Section {
    id: string;
    title: string;
    description: string;
    questions: Question[];
}

export const questionnaireSections: Section[] = [
    {
        id: 'general_health',
        title: 'General Health & Medical History',
        description: 'Help us understand your current health status to ensure safety.',
        questions: [
            { id: 'q1', text: 'Current Age', type: 'number', required: true },
            { id: 'q2', text: 'Height (cm)', type: 'number', required: true },
            { id: 'q3', text: 'Current Weight (kg)', type: 'number', required: true },
            { id: 'q4', text: 'Do you have any known medical conditions?', type: 'textarea', placeholder: 'e.g., Diabetes, Hypertension, Asthma...' },
            { id: 'q5', text: 'Are you currently taking any medication?', type: 'textarea', placeholder: 'Please list name and dosage' },
            { id: 'q6', text: 'Do you have any past surgeries or injuries?', type: 'textarea', placeholder: 'e.g., ACL reconstruction 2020' },
            { id: 'q7', text: 'Do you experience joint pain?', type: 'multiselect', options: ['None', 'Knees', 'Back', 'Shoulders', 'Elbows', 'Ankles'] },
            { id: 'q8', text: 'Family history of heart disease?', type: 'radio', options: ['Yes', 'No', 'Unknown'] },
            { id: 'q9', text: 'Do you smoke?', type: 'radio', options: ['Yes', 'No', 'Occasionally'] },
            { id: 'q10', text: 'Do you consume alcohol?', type: 'select', options: ['Never', 'Rarely', 'Socially', 'Frequently'] },
            { id: 'q11', text: 'Resting Heart Rate (if known)', type: 'number', placeholder: 'bpm' },
            { id: 'q12', text: 'Blood Pressure (if known)', type: 'text', placeholder: 'e.g., 120/80' },
        ]
    },
    {
        id: 'lifestyle',
        title: 'Lifestyle & Routine',
        description: 'Tell us about your daily life and habits.',
        questions: [
            { id: 'q13', text: 'Occupation', type: 'text' },
            { id: 'q14', text: 'Activity level at work', type: 'select', options: ['Sedentary (Desk job)', 'Lightly Active', 'Active (On feet all day)', 'Very Active (Physical labor)'] },
            { id: 'q15', text: 'Average daily steps', type: 'select', options: ['< 3,000', '3,000 - 5,000', '5,000 - 8,000', '8,000 - 12,000', '12,000+'] },
            { id: 'q16', text: 'Average sleep duration (hours)', type: 'number', step: '0.5' },
            { id: 'q17', text: 'Sleep quality', type: 'select', options: ['Poor', 'Fair', 'Good', 'Excellent'] },
            { id: 'q18', text: 'Stress levels (1-10)', type: 'number', min: 1, max: 10 },
            { id: 'q19', text: 'How much time can you dedicate to training per day?', type: 'select', options: ['30 mins', '45 mins', '60 mins', '90 mins+'] },
            { id: 'q20', text: 'Preferred time to workout', type: 'select', options: ['Morning', 'Afternoon', 'Evening', 'Late Night'] },
            { id: 'q21', text: 'Days available for training', type: 'multiselect', options: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
            { id: 'q22', text: 'Do you have access to a gym?', type: 'radio', options: ['Yes, full gym', 'Home gym (limited)', 'No, bodyweight only'] },
            { id: 'q23', text: 'How do you commute?', type: 'select', options: ['Car', 'Public Transport', 'Walk/Bike', 'Work from Home'] },
        ]
    },
    {
        id: 'nutrition',
        title: 'Nutrition & Dietary Habits',
        description: 'Understanding your relationship with food.',
        questions: [
            { id: 'q24', text: 'Dietary preference', type: 'select', options: ['No restrictions', 'Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo'] },
            { id: 'q25', text: 'Food allergies or intolerances', type: 'textarea', placeholder: 'e.g., Peanuts, Lactose, Gluten...' },
            { id: 'q26', text: 'How many meals do you eat per day?', type: 'number' },
            { id: 'q27', text: 'Do you track calories/macros?', type: 'radio', options: ['Yes, consistently', 'Sometimes', 'No, never'] },
            { id: 'q28', text: 'Daily water intake (Liters)', type: 'number', step: '0.5' },
            { id: 'q29', text: 'Do you take supplements?', type: 'textarea', placeholder: 'e.g., Whey, Creatine, Multivitamins...' },
            { id: 'q30', text: 'Frequency of eating out/ordering in', type: 'select', options: ['Rarely', '1-2 times/week', '3-5 times/week', 'Daily'] },
            { id: 'q31', text: 'Do you crave sweets/salty foods?', type: 'text', placeholder: 'Describe cravings' },
            { id: 'q32', text: 'Do you cook your own meals?', type: 'radio', options: ['Mostly yes', '50/50', 'Mostly no'] },
            { id: 'q33', text: 'Coffee/Tea consumption (cups/day)', type: 'number' },
            { id: 'q34', text: 'Alcohol consumption per week (drinks)', type: 'number' },
        ]
    },
    {
        id: 'fitness_history',
        title: 'Fitness History & Experience',
        description: 'Your past experience with exercise.',
        questions: [
            { id: 'q35', text: 'Training experience (years)', type: 'select', options: ['Beginner (<1 year)', 'Intermediate (1-3 years)', 'Advanced (3+ years)'] },
            { id: 'q36', text: 'Have you worked with a coach before?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q37', text: 'What types of exercise do you enjoy?', type: 'textarea', placeholder: 'e.g., Weightlifting, Running, Yoga...' },
            { id: 'q38', text: 'What types of exercise do you dislike?', type: 'textarea' },
            { id: 'q39', text: 'Can you perform a squat?', type: 'radio', options: ['Yes, with weight', 'Bodyweight only', 'With difficulty', 'No'] },
            { id: 'q40', text: 'Can you perform a pushup?', type: 'radio', options: ['Yes, multiple', 'Yes, a few', 'On knees', 'No'] },
            { id: 'q41', text: 'Cardio preference', type: 'select', options: ['Running', 'Cycling', 'Swimming', 'Walking', 'HIIT', 'None'] },
            { id: 'q42', text: 'Current 1RM Bench Press (if known)', type: 'text' },
            { id: 'q43', text: 'Current 1RM Squat (if known)', type: 'text' },
            { id: 'q44', text: 'Current 1RM Deadlift (if known)', type: 'text' },
        ]
    },
    {
        id: 'goals',
        title: 'Goals & Motivation',
        description: 'What do you want to achieve?',
        questions: [
            { id: 'q45', text: 'Primary Goal', type: 'select', options: ['Fat Loss', 'Muscle Gain', 'Strength', 'Endurance', 'General Health'] },
            { id: 'q46', text: 'Target Weight (kg)', type: 'number' },
            { id: 'q47', text: 'Timeline for this goal', type: 'select', options: ['3 months', '6 months', '1 year', 'No deadline'] },
            { id: 'q48', text: 'Why is this goal important to you?', type: 'textarea', required: true },
            { id: 'q49', text: 'What has stopped you in the past?', type: 'textarea' },
            { id: 'q50', text: 'How committed are you? (1-10)', type: 'number', min: 1, max: 10 },
            { id: 'q51', text: 'Specific body parts to focus on', type: 'textarea' },
            { id: 'q52', text: 'Do you want to track body measurements?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q53', text: 'Do you want to take progress photos?', type: 'radio', options: ['Yes', 'No'] },
        ]
    },
    {
        id: 'mental_wellbeing',
        title: 'Mental Wellbeing & Mindset',
        description: 'Your mindset is key to success.',
        questions: [
            { id: 'q54', text: 'How would you rate your current motivation?', type: 'select', options: ['Low', 'Moderate', 'High', 'Unstoppable'] },
            { id: 'q55', text: 'Do you struggle with body image?', type: 'radio', options: ['Yes', 'Sometimes', 'No'] },
            { id: 'q56', text: 'Do you have a support system?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q57', text: 'How do you handle setbacks?', type: 'textarea' },
            { id: 'q58', text: 'Are you willing to change your habits?', type: 'radio', options: ['Yes, absolutely', 'Yes, but slowly', 'Not sure'] },
        ]
    },
    {
        id: 'final',
        title: 'Final Details',
        description: 'Almost done!',
        questions: [
            { id: 'q59', text: 'Any other information we should know?', type: 'textarea' },
            { id: 'q60', text: 'Preferred communication method', type: 'select', options: ['WhatsApp', 'Email', 'App Chat'] },
            { id: 'q61', text: 'How did you hear about us?', type: 'text' },
            { id: 'q62', text: 'Referral Code (if any)', type: 'text' },
            { id: 'q63', text: 'I agree to the terms and conditions', type: 'radio', options: ['Yes'] },
            { id: 'q64', text: 'Ready to start?', type: 'radio', options: ['Yes!'] },
        ]
    }
];
