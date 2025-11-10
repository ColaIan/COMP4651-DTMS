import { env } from '$env/dynamic/private';
import { WebPubSubServiceClient, type JSONTypes } from '@azure/web-pubsub';

export const trainingService = new WebPubSubServiceClient(env.AZURE_WEB_PUBSUB_URL, 'trainings');

export const sendTrainingMessage = async (trainingId: string, data: JSONTypes) =>
	await trainingService.group(trainingId).sendToAll(data);

export const getTrainingGroupUrl = async (trainingId: string) =>
	(await trainingService.getClientAccessToken({ groups: [trainingId] })).url;
