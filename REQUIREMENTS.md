# Read the room app 

An app that has a QR code that can be displayed during a meeting. Attendees can scan the QR code or easily login on mobile phones. 

When a user first visits the app, they will be taken to a screen to create a new meeting. This will allow them to set the title for the meeting. The app will generate a unique, human-readable meeting code in the format XXX-XXX-XXX (where X is an uppercase letter or number, e.g., "ABC-123-XYZ"). This code can be used in a URL to easily share and join the meeting. While the meeting also has an internal UUID for database purposes, the human-readable code is used for all user-facing interactions including the QR code, sharing links, and API endpoints.

When presenting a “MeetingRoom Session”, the app will display: 

1. The name of the meeting. 
2. A large QR code that can be scanned to allow participants to join the session. This will take them to the sign-on screen
3. A large bar chart showing the current engagement statistics for the meeting from all attendees. 
4. A count of the current user reactions
5. A row of ‘state’ buttons for the attendees to click to register their current sentiment as described above. 

Attendees of the meeting can click a small intuitive number of buttons that indicate their reactions to what is being presented. 

* Inactive / Disengaged
* Engaged
* Confused

When a user joins the app they will be in Engaged status. They can click any of the buttons to change their status at any time. 

Additionally there will be buttons to allow a user to react to the immediate content being presented. These will display on the main meeting room screen temporarily on the bar chart and each reaction will be cleared 10 seconds later, which will reflect on the bar chart statistics. The users status will remain the same when using these buttons. 

* Agree
* Disagree

Users will have a button to allow them to make a comment. This will be posted and recorded on the meeting room session and displayed in thought bubble in a scrolling dialog on the main screen. 
