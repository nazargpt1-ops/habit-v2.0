// src/hooks/useUserProfile.ts
import useSWR from 'swr';
import { fetchUserProfile } from '../services/habitService';

export function useUserProfile() {
  const { data, mutate, isLoading } = useSWR('user-profile', fetchUserProfile, {
    revalidateOnFocus: false
  });

  return { userProfile: data, mutateUserProfile: mutate, isProfileLoading: isLoading };
}
