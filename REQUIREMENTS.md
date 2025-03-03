# Read the room app 

An app that has a QR code that can be displayed during a meeting. Attendees can scan the QR code or easily login on mobile phones. 

When a user first visits the app, they will be taken to a screen to create a new meeting. This will allow them to set the title for the meeting. The app will generate a unique, human-readable meeting code in the format XXX-XXX-XXX (where X is an uppercase letter or number, e.g., "ABC-123-XYZ"). This code can be used in a URL to easily share and join the meeting. While the meeting also has an internal UUID for database purposes, the human-readable code is used for all user-facing interactions including the QR code, sharing links, and API endpoints.

When creating a meeting, users have two options:
1. Join as a participant - Takes them to the standard MeetingRoom view
2. Open host view - Takes them to a dedicated presentation view designed for displaying on a large screen

## Meeting Room View

When presenting a "MeetingRoom Session", the app will display: 

1. The name of the meeting. 
2. A large QR code that can be scanned to allow participants to join the session. This will take them to the sign-on screen
3. A large bar chart showing the current engagement statistics for the meeting from all attendees. 
4. A count of the current user reactions
5. A row of 'state' buttons for the attendees to click to register their current sentiment as described above. 

Attendees of the meeting can click a small intuitive number of buttons that indicate their reactions to what is being presented. 

* Inactive / Disengaged
* Engaged
* Confused

When a user joins the app they will be in Engaged status. They can click any of the buttons to change their status at any time. 

Additionally there will be buttons to allow a user to react to the immediate content being presented. These will display on the main meeting room screen temporarily on the bar chart and each reaction will be cleared 10 seconds later, which will reflect on the bar chart statistics. The users status will remain the same when using these buttons. 

* Agree
* Disagree

Users will have a button to allow them to make a comment. This will be posted and recorded on the meeting room session and displayed in thought bubble in a scrolling dialog on the main screen. 

## Host View

The host view is designed specifically for presentation on a large screen during meetings. This view will display:

1. Meeting Information
   - Meeting title prominently displayed
   - Host's name
   - Total count of current attendees

2. QR Code Section (Right Side)
   - Large, prominent QR code for easy scanning
   - Meeting join URL displayed below the QR code

3. Statistics Display (Left Side)
   - Pie chart showing real-time attendee status distribution
   - Only shows three main statuses: Engaged, Confused, and Inactive
   - Updates automatically as attendees change their status

4. Reaction Animations
   - Displays current reactions (Agree/Disagree) as animated icons
   - Thumbs up/down icons float upward over the pie chart
   - Icons gently wave left and right as they ascend
   - Each reaction disappears after reaching the top of the screen

The host view is optimized for large displays and does not include interactive elements like status buttons or comment input, as it's intended purely for presentation purposes. All attendees who scan the QR code will be directed to the standard meeting room view where they can participate actively.
