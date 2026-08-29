export interface Question {
    id: string;
    text: string;
    description?: string; // Instructional text
    type: 'text' | 'number' | 'select' | 'radio' | 'textarea' | 'multiselect' | 'rating';
    options?: string[];
    placeholder?: string;
    required?: boolean;
    step?: string;
    min?: number;
    max?: number;
    rows?: number; // For textarea
}

export interface Section {
    id: string;
    title: string;
    description: string;
    questions: Question[];
}

export const questionnaireSections: Section[] = [
    {
        id: 'basic_details',
        title: 'Section 1: Your Basic Details',
        description: ' Let\'s get to know you.',
        questions: [
            { id: 'q1', text: 'Your Name?', type: 'text', required: true },
            { id: 'q2', text: 'Your Age?', type: 'number', required: true },
            { id: 'q3', text: 'Your Height?', placeholder: 'in cm', type: 'number', required: true },
            { id: 'q4', text: 'Your Weight?', placeholder: 'in kg', type: 'number', required: true },
            { id: 'q5', text: 'Current place of residence?', placeholder: 'City, Country', type: 'text' },
            {
                id: 'q6',
                text: 'What\'s your Occupation?',
                description: 'This will make us understand your activity level in a day',
                type: 'text'
            },
            { id: 'q7', text: 'Your WhatsApp Number', type: 'text', required: true },
        ]
    },
    {
        id: 'body_measurements',
        title: 'Section 2: Body Measurements',
        description: 'Enter all measurements in Centimeters. Take empty stomach measurement.',
        questions: [
            {
                id: 'q8',
                text: 'Waist',
                description: '(Measure with a tape, half a cam above your belly button)',
                type: 'number'
            },
            {
                id: 'q9',
                text: 'Hip',
                description: '(Measure around the widest portion of your hipbone)',
                type: 'number'
            },
            { id: 'q10', text: 'Neck', type: 'number' },
            { id: 'q11', text: 'Quad', type: 'number' },
            { id: 'q12', text: 'Chest', type: 'number' },
            {
                id: 'q13',
                text: 'Arms',
                description: '(Mid point of elbow and shoulder)',
                type: 'number'
            },
        ]
    },
    {
        id: 'goals',
        title: 'Section 3: Your Goals',
        description: 'Ensure that your goal follows the SMARTS framework (Specific, Measurable, Achievable, Realistic, Time-oriented, Sustainable).',
        questions: [
            { id: 'q14', text: 'What’s your fitness goal?', type: 'textarea', required: true, rows: 4 },
            { id: 'q15', text: 'Have you attempted to reach these goals in the past?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q16', text: 'Did you reach them?', type: 'radio', options: ['Yes', 'No', 'Partially'] },
            { id: 'q17', text: 'Why did you revert after reaching your goal?', type: 'textarea' },
            { id: 'q18', text: 'Why weren\'t you able to reach?', type: 'textarea' },
            { id: 'q19', text: 'What did you do to reach/try and reach your goal?', type: 'textarea' },
            { id: 'q20', text: 'What is different this time around?', type: 'textarea' },
            { id: 'q21', text: 'What do you feel worked and didn’t work last time and why?', type: 'textarea' },
            { id: 'q22', text: 'What were your biggest hurdles/disappointments?', type: 'textarea' },
            { id: 'q23', text: 'What were your biggest successes?', type: 'textarea' },
            { id: 'q24', text: 'How will you feel if you reach your goal this time?', type: 'textarea' },
            { id: 'q25', text: 'How will you feel if you don’t reach your goal?', type: 'textarea' },
            { id: 'q26', text: 'What is your plan when you reach your goal?', type: 'textarea' },
            { id: 'q27', text: 'How do you feel reaching your goal will impact your life?', type: 'textarea' },
        ]
    },
    {
        id: 'lifestyle',
        title: 'Section 4: Lifestyle Commitment',
        description: 'Understanding your habits.',
        questions: [
            { id: 'q28', text: 'Do you have the habit of drinking alcohol?', type: 'radio', options: ['Yes', 'No'] },
            {
                id: 'q29',
                text: 'How often do you consume alcohol?',
                description: 'In a week? Monthly? How much quantity?',
                type: 'text'
            },
            { id: 'q30', text: 'Are you willing to give up drinking to reach your goal or for the sake of your health?', type: 'radio', options: ['Yes', 'No', 'Maybe'] },
            { id: 'q31', text: 'Are you willing to cut down the consumption of processed junk food?', type: 'radio', options: ['Yes', 'No'] },
            {
                id: 'q32',
                text: 'What will be the one thing that will be very hard for you to give up?',
                description: 'Be honest so we can understand you more',
                type: 'textarea'
            },
            { id: 'q33', text: 'How many days in a week can you work out?', type: 'select', options: ['1-2 days', '3-4 days', '5-6 days', 'Every day'] },
            { id: 'q34', text: 'Do you have access to a gym? Or are you preferring Home workouts?', type: 'select', options: ['Gym Access', 'Home Workouts'] },
        ]
    },
    {
        id: 'training_history',
        title: 'Section 5: Training History',
        description: 'Your past experience with exercise.',
        questions: [
            { id: 'q35', text: 'Have you attended a gym before?', type: 'radio', options: ['Yes', 'No'] },
            {
                id: 'q36',
                text: 'Have you lost a good amount of weight before?',
                description: 'If your goal is to GAIN weight just mention those stats',
                type: 'radio',
                options: ['Yes', 'No']
            },
            { id: 'q37', text: 'When was it?', type: 'text' },
            { id: 'q38', text: 'How much weight difference were you able to acheive?', type: 'text' },
            { id: 'q39', text: 'Over what timeframe?', type: 'text' },
            { id: 'q40', text: 'If you have put the weight back on ,then how long did it take?', type: 'text' },
            { id: 'q41', text: 'How did you feel when you had lost the weight?', type: 'textarea' },
            { id: 'q42', text: 'Did losing weight create problems you didn’t anticipate?', type: 'textarea' },
            {
                id: 'q43',
                text: 'What forms of exercise were you indulged in the past?',
                description: 'Was it just cardio? general weight training/bodyweight training/ crossfit ?',
                type: 'textarea'
            },
            {
                id: 'q44',
                text: 'Throughout your life, when did you feel your best emotionally / mentally / physically?',
                description: '-What were you doing then that contributed to that? -What were you not doing then that contributed to that?',
                type: 'textarea',
                rows: 4
            },
            { id: 'q45', text: 'What are you currently doing for exercise? (Give a brief about your routine)', type: 'textarea' },
        ]
    },
    {
        id: 'nutrition_history',
        title: 'Section 6: Your Nutrition History',
        description: '',
        questions: [
            { id: 'q46', text: 'Have you been on a nutrition plan before?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q47', text: 'WHEN WAS IT?', type: 'text' },
            { id: 'q48', text: 'FOR HOW LONG DID YOU STAY ON IT?', type: 'text' },
            { id: 'q49', text: 'How many diets or nutrition plans have you tried before?', type: 'text' },
            { id: 'q50', text: 'Have you ever tracked calories before?', type: 'radio', options: ['Yes', 'No'] },
            {
                id: 'q51',
                text: 'Do you know how to properly track calories?',
                description: '0-3: Never heard/tried. 3-5: Tried/don\'t know much. 5-7: Tried for some time/basics. 7-10: Well informed/experienced.',
                type: 'rating',
                min: 0,
                max: 10
            },
            { id: 'q52', text: 'Are you willing to track calories once you’re in our program if we teach you?', type: 'radio', options: ['Yes', 'No'] },
            {
                id: 'q53',
                text: 'What does your food look like on a really good eating day?',
                description: 'You can give an example of a full day of eating which makes you feel you ate in a healthy manner',
                type: 'textarea'
            },
            { id: 'q54', text: 'What does your food look like on a really bad eating day?', type: 'textarea' },
            { id: 'q55', text: 'List the most common foods that you eat (meats, vegetables, dishes, etc.) on a daily basis?', type: 'textarea' },
        ]
    },
    {
        id: 'health_medical',
        title: 'Section 7: Health & Medical Background',
        description: '',
        questions: [
            { id: 'q56', text: 'Do you have any current injuries that can hinder your workouts?', type: 'textarea' },
            { id: 'q57', text: 'Did you have any injuries in the past?', type: 'textarea' },
            { id: 'q58', text: 'Have you ever undergone any surgeries?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q59', text: 'What was it?', type: 'text' },
            { id: 'q60', text: 'Do you have any addiction that you are aware of? (Alcohol, drugs, porn, etc.)', type: 'text' },
            { id: 'q61', text: 'Do you have any known hormonal or vitamin deficiencies?', type: 'text' },
            { id: 'q62', text: 'Do you have any current health issues?', type: 'text' },
            { id: 'q63', text: 'Do you have a family history of:', type: 'textarea', placeholder: 'Heart disease, diabetes, etc.' },
            { id: 'q64', text: 'Do you have any known food allergies?', type: 'text' },
            { id: 'q65', text: 'Are you taking any supplementation?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q66', text: 'What all are you taking , how often, and why?', type: 'textarea' },
            { id: 'q67', text: 'Do you have anything against taking supplementation if we recommend it?', type: 'text' },
            { id: 'q68', text: 'List all current medications and how long you’ve been on them.', type: 'textarea' },
        ]
    },
    {
        id: 'daily_activity',
        title: 'Section 8: Daily Activity & Habits',
        description: '',
        questions: [
            {
                id: 'q69',
                text: 'What is your current level of activity?',
                type: 'select',
                options: [
                    'Sedentary-Desk job with little to no exercise',
                    'Light Activity- Exercise moderately 1–3 times a week',
                    'Moderately active- Exercise 2-3 times + sedentary job',
                    'Active - Physical work, hard exercise 5+ days a week',
                    'Highly Active-Physical work, exercise very hard 6+ days a week'
                ]
            },
            {
                id: 'q70',
                text: 'How many litres of water do you consume each day?',
                description: 'If you haven\'t thought about it, mention that. If you\'re aware of it, mention that.',
                type: 'text'
            },
            {
                id: 'q71',
                text: 'How many caffeinated drinks do you consume per day?',
                description: '(Coffee, Soft Drinks, Energy Drinks, Green Tea)',
                type: 'text'
            },
        ]
    },
    {
        id: 'sleep_recovery',
        title: 'Section 9: Sleep & Recovery',
        description: '',
        questions: [
            { id: 'q72', text: 'How many hours of sleep do you get daily?', type: 'select', options: ['4 hours', '5 hours', '6 hours', '7 hours', '8+ hours'] },
            {
                id: 'q73',
                text: 'How is your quality of sleep on average?',
                description: '0- You being tired after waking up. 5-You\'re well rested and energetic.',
                type: 'rating',
                min: 0,
                max: 5
            },
            { id: 'q74', text: 'Do you have dark circles under your eyes?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q75', text: 'Do you keep waking up in the middle of sleep at night?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q76', text: 'How is your memory?', description: 'Do you frequently misplace things or forget conversations?', type: 'text' },
        ]
    },
    {
        id: 'stress_gut',
        title: 'Section 10: Stress & Gut Health',
        description: 'Allocate stars (1=Rarely, 5=Severe)',
        questions: [
            {
                id: 'q77',
                text: 'Do you have sugar cravings?',
                type: 'select',
                options: ['Very rarely here and there', 'A bit frequent but still manageable', 'A lot! Very hard to restrict myself']
            },
            { id: 'q78', text: 'Do you feel anxious often?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q79', text: 'Are you easily agitated?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q80', text: 'Do you get sick often?', type: 'radio', options: ['Yes', 'No'] },
            { id: 'q81', text: 'List the 3 biggest stresses in your life (relationships, work, family, finance, etc.)', type: 'textarea' },
            { id: 'q82', text: 'Burping', description: '1 star = Symptom is not present / rarely present. 5 star = Severe / almost always', type: 'rating', min: 1, max: 5 },
            { id: 'q83', text: 'Fullness for an extended time after meals', type: 'rating', min: 1, max: 5 },
            { id: 'q84', text: 'Bloating', type: 'rating', min: 1, max: 5 },
            { id: 'q85', text: 'Poor appetite', type: 'rating', min: 1, max: 5 },
            { id: 'q86', text: 'Stomach upsets really easily', type: 'rating', min: 1, max: 5 },
            { id: 'q87', text: 'Do you have constipation?', type: 'radio', options: ['Yes', 'No'] },
        ]
    }
];
