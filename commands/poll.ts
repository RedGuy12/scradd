import {
	ActionRowData,
	ApplicationCommandOptionType,
	ComponentType,
	ModalActionRowComponentData,
	TextInputStyle,
} from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { defineCommand } from "../common/types/command.js";
import { reactAll } from "../util/discord.js";
import twemojiRegexp from "../util/twemojiRegexp.js";

const DEFAULT_THUMBS = ["👍", "👎"];
const DEFAULT_SHAPES = ["🔺", "🟡", "🟩", "🔷", "💜"];
const DEFAULT_VALUES = ["Yes", "No"];

const command = defineCommand({
	data: {
		description: "Poll people on a question",
		options: {
			"question": {
				type: ApplicationCommandOptionType.String,
				required: true,
				description: "The question to ask",
				maxLength: 94,
			},
			"options": {
				type: ApplicationCommandOptionType.Integer,
				description: "The number of options to have (defaults to 2)",
				minValue: 1,
				maxValue: 5,
			},
			"vote-mode": {
				type: ApplicationCommandOptionType.Boolean,
				description: "Restrict people to one reaction on this poll",
			},
		},
	},

	async interaction(interaction) {
		const optionCount = interaction.options.getInteger("options") ?? 2;
		const components = [];
		for (let i = 0; i < optionCount; i++)
			components.push({
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						customId: `${i}`,
						label: `Option #${i + 1}`,
						required: true,
						style: TextInputStyle.Short,
						value: optionCount < DEFAULT_VALUES.length ? DEFAULT_VALUES[i] : undefined,
					},
				],
			} satisfies ActionRowData<ModalActionRowComponentData>);

		await interaction.showModal({
			title: "Set Up Poll",
			components,
			customId:
				Number(interaction.options.getBoolean("vote-mode")) +
				interaction.options.getString("question", true) +
				"_poll",
		});
	},

	modals: {
		async poll(interaction, [voteMode, ...characters] = "") {
			const question = characters.join("");
			const regex = new RegExp(`^${twemojiRegexp.source}`);

			const { customReactions, options } = interaction.fields.fields.reduce<{
				customReactions: (string | undefined)[];
				options: string[];
			}>(
				({ customReactions, options }, field) => {
					const emoji = field.value.match(regex)?.[0];
					return {
						options: [
							...options,
							(emoji ? field.value.replace(emoji, "") : field.value).trim(),
						],
						customReactions: [
							...customReactions,
							customReactions.includes(emoji) ? undefined : emoji,
						],
					};
				},
				{ customReactions: [], options: [] },
			);
			const shapes = DEFAULT_SHAPES.filter((emoji) => !customReactions.includes(emoji));
			const reactions =
				(options.length < 3 &&
					customReactions.some((emoji): emoji is undefined => !emoji) &&
					DEFAULT_THUMBS.slice(0, options.length + 1)) ||
				customReactions.map((emoji) => emoji ?? shapes.shift() ?? "");

			const message = await interaction.reply({
				embeds: [
					{
						color: CONSTANTS.themeColor,
						title: question,
						description: options
							.map((option, index) => `${reactions[index]} ${option}`)
							.join("\n"),
						footer:
							voteMode === "1"
								? { text: "You can only vote once on this poll." }
								: undefined,
					},
				],
				fetchReply: true,
			});
			await reactAll(message, reactions);
		},
	},
});
export default command;