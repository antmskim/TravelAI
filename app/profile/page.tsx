// app/profile/page.tsx
'use client'; // This is important if you're using App Router and client-side interactivity

import React, { useState } from 'react';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component from Shadcn UI

export default function ProfilePage() {
    // State to hold form data
    const [formData, setFormData] = useState({
        from: '',
        likes: '',
        dislikes: '',
        interests: '',
        dietaryPreferences: '',
        age: '',
        travelStyle: '', // e.g., adventurous, relaxing, cultural
        travelCompanions: '', // e.g., solo, family, friends, couple
        budgetPreference: '', // e.g., economy, mid-range, luxury
        physicalLimitations: '', // e.g., walking difficulties, allergies
        priorTravelExperiences: '', // brief summary
    });

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Profile data submitted:", formData);
        // Here you would typically send this data to your backend API.
        // For example:
        // fetch('/api/save-profile', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify(formData),
        // })
        // .then(response => response.json())
        // .then(data => {
        //     console.log('Success:', data);
        //     alert('Profile saved successfully!');
        // })
        // .catch((error) => {
        //     console.error('Error saving profile:', error);
        //     alert('Failed to save profile.');
        // });
        alert('Profile data submitted! Check console for data.');
    };

    return (
        <div className="p-12 max-w-4xl mx-auto bg-white rounded-lg shadow-md">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-6 text-center">My Travel Profile</h1>
            <p className="text-gray-600 mb-8 text-center">
                Tell us about yourself so our AI agents can create the perfect travel plans tailored just for you!
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section: Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="from" className="block text-sm font-medium text-gray-700 mb-1">Where are you from?</label>
                        <input
                            type="text"
                            id="from"
                            name="from"
                            value={formData.from}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="e.g., New York, USA"
                        />
                    </div>
                    <div>
                        <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">Age (optional, for travel style suggestions)</label>
                        <input
                            type="number"
                            id="age"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="e.g., 30"
                        />
                    </div>
                </div>

                {/* Section: Preferences and Interests */}
                <div>
                    <label htmlFor="likes" className="block text-sm font-medium text-gray-700 mb-1">What travel activities/experiences do you generally like?</label>
                    <textarea
                        id="likes"
                        name="likes"
                        rows={3}
                        value={formData.likes}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., cultural tours, hiking, beach relaxation, nightlife, historical sites, museums, food tours, shopping"
                    ></textarea>
                </div>

                <div>
                    <label htmlFor="dislikes" className="block text-sm font-medium text-gray-700 mb-1">What travel activities/experiences do you generally dislike or want to avoid?</label>
                    <textarea
                        id="dislikes"
                        name="dislikes"
                        rows={3}
                        value={formData.dislikes}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., crowded places, extreme sports, long bus rides, very early mornings, heavy physical activity"
                    ></textarea>
                </div>

                <div>
                    <label htmlFor="interests" className="block text-sm font-medium text-gray-700 mb-1">Any specific hobbies or interests that could influence your travel (e.g., photography, bird watching, wine tasting, diving)?</label>
                    <textarea
                        id="interests"
                        name="interests"
                        rows={3}
                        value={formData.interests}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., photography, culinary arts, history, nature, adventure sports, fashion, music festivals"
                    ></textarea>
                </div>

                {/* Section: Dietary and Health */}
                <div>
                    <label htmlFor="dietaryPreferences" className="block text-sm font-medium text-gray-700 mb-1">Dietary preferences or restrictions?</label>
                    <textarea
                        id="dietaryPreferences"
                        name="dietaryPreferences"
                        rows={2}
                        value={formData.dietaryPreferences}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., vegetarian, vegan, gluten-free, no nuts, halal, kosher"
                    ></textarea>
                </div>

                <div>
                    <label htmlFor="physicalLimitations" className="block text-sm font-medium text-gray-700 mb-1">Any physical limitations or accessibility needs to consider?</label>
                    <textarea
                        id="physicalLimitations"
                        name="physicalLimitations"
                        rows={2}
                        value={formData.physicalLimitations}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., uses a wheelchair, difficulty walking long distances, need for elevators"
                    ></textarea>
                </div>

                {/* Section: Travel Specifics */}
                <div>
                    <label htmlFor="travelStyle" className="block text-sm font-medium text-gray-700 mb-1">What is your preferred travel style?</label>
                    <select
                        id="travelStyle"
                        name="travelStyle"
                        value={formData.travelStyle}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">Select a style</option>
                        <option value="adventurous">Adventurous (e.g., thrilling activities, off-the-beaten-path)</option>
                        <option value="relaxing">Relaxing (e.g., spa, beach, no fixed itinerary)</option>
                        <option value="cultural">Cultural (e.g., museums, historical sites, local traditions)</option>
                        <option value="luxury">Luxury (e.g., high-end resorts, fine dining)</option>
                        <option value="budget-friendly">Budget-Friendly (e.g., hostels, local eateries)</option>
                        <option value="family-friendly">Family-Friendly (e.g., activities for all ages)</option>
                        <option value="eco-tourism">Eco-Tourism (e.g., sustainable travel, nature-focused)</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="travelCompanions" className="block text-sm font-medium text-gray-700 mb-1">Who do you usually travel with?</label>
                    <input
                        type="text"
                        id="travelCompanions"
                        name="travelCompanions"
                        value={formData.travelCompanions}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., solo, partner, family with young kids, friends, group tour"
                    />
                </div>

                <div>
                    <label htmlFor="budgetPreference" className="block text-sm font-medium text-gray-700 mb-1">What's your general budget preference?</label>
                    <select
                        id="budgetPreference"
                        name="budgetPreference"
                        value={formData.budgetPreference}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">Select a preference</option>
                        <option value="economy">Economy / Budget-conscious</option>
                        <option value="mid-range">Mid-Range</option>
                        <option value="luxury">Luxury / High-end</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="priorTravelExperiences" className="block text-sm font-medium text-gray-700 mb-1">Briefly describe any prior travel experiences or preferred destinations.</label>
                    <textarea
                        id="priorTravelExperiences"
                        name="priorTravelExperiences"
                        rows={3}
                        value={formData.priorTravelExperiences}
                        onChange={handleChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., 'Loved hiking in Patagonia', 'Visited Japan last year, want something different', 'First time traveling internationally'"
                    ></textarea>
                </div>

                <div className="flex justify-center">
                    <Button type="submit" className="px-8 py-3 text-lg">Save Profile</Button>
                </div>
            </form>
        </div>
    );
}