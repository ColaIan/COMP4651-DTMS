import { AZURE_WEB_PUBSUB_URL } from '$env/static/private';
import { WebPubSubServiceClient, type JSONTypes } from '@azure/web-pubsub';

let trainingService: WebPubSubServiceClient | undefined = undefined;
export const getTrainingService = () =>
	trainingService ||
	(trainingService = new WebPubSubServiceClient(AZURE_WEB_PUBSUB_URL, 'trainings'));

export const sendTrainingMessage = async (trainingId: string, data: JSONTypes) =>
	await getTrainingService().group(trainingId).sendToAll(data);

export const getTrainingGroupUrl = async (trainingId: string) =>
	(await getTrainingService().getClientAccessToken({ groups: [trainingId] })).url;
