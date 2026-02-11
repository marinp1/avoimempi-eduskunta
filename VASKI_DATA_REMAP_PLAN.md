# Plan to refactor vaskidata analysis

At the moment VaskiData fields are handled completely separately and make relational dataship managenet extremely difficult, there a tables such as VaskiDocument, VaskiDocumentActor, VaskiMeeting, VaskiMeetingAgenda, VaskiMinutesSection, VaskiMinutesPlan, VaskiMinutesAttachment et cetera.

Let's refactor the data parsing and migration so that vaskidata is extracted into proper tables instead of just making Vaski-prefixed tables.

For example, we might have contents in vaski data that is related to sessions ans session sections; those should instead either APPEND content to the session AND section tables OR create new tables if it makes sense.

For example, for a given session we might have "Päiväjärjestys", "Pöytäkirjan pääsivu", or "Pöytäkirja" 
For session sections, we might have references to "Nimenhuuto", "Hallituksen esitys" etc.
Each of those sections might have "Speeches" or "Votings"

These are just a few examples. I want to traverse the database in an proper relational way.

Implement a better way to handle the vaskidata processing and migration.

Feel free to adjust the parser to preprocess the data if that makes sense. Do NOT invent relationsships between data, ask FOR the links if necessary, for example @_muuTunnus can refer to multiple different fields depending on the content.

