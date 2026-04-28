
## Overview
This project is a web-based writing environment designed specifically for journalists and editors. It combines document creation, research, citation management, and collaboration into a single platform. Unlike traditional word processors, this application is tailored to newsroom workflows, allowing users to organize sources, track references, and collaborate efficiently.

The system supports two roles:
## Writers: Can create, edit, and publish documents
## Editors: Invited collaborators with read-only access and commenting permissions.

## Installation Guide
## Prerequisites

Make sure the following are installed on your system:

Node.js
npm (comes with Node.js)
Visual Studio Code (recommended)

## Setup Instructions
1.Clone the repository
2.Open the project in VS Code
3.Open a terminal and run the backend server
cd backend
npm install
npm run dev
You should see: Server running on port 3001
4.Open a second terminal and run the frontend (word processor)
cd word-processor
npm install
npm run dev
5.Launch the app by copying the local URL shown in the terminal and paste it into your browser


## User Guide
1.Authentication
Users can sign up or log in using email and password
Account data is stored in JSON format
2.Dashboard
After logging in, users see two sections:
Writer: Documents they own and can edit
Editor: Documents shared with them (read-only)
3.Create Document
Writers can create a new document using the “+” button.


## Document Editor Features
## Layout

Each document includes:
Left Sidebar: Searchbar and sources
Main Editor: Writing area
Bottom Panel: Collaboration details

## Integrated Browser

Users can search or paste links into the sidebar
Non-commercial sites (e.g., Wikipedia) open inside the app
Commercial sites open in a new browser tab

## Citation Management
Pasting a link automatically generates a citation
Users can edit citations for accuracy
Source types include:Website, Book,Article/Journal, Film/Movie, Interview/ Word of mouth
Each type dynamically provides relevant fields (e.g., publisher, year).


## Text Editor Tools
## Editing
Undo / Redo recent changes 

## Formatting
Normal text, Heading 1, Heading 2
Bold, Italic, Underline
Text Alignment: Left, Center, Right
Bullet points and numbered lists

## Insert
Add images

## Comments
Add comments to the document
Resolve comments

## Sharing & Publishing
Generate shareable document link
Invite a user as a collaborator by adding their email username
Publish directly to WordPress (writers only)

## Collaboration System
Document Owner (Writer): Full edit access, can publish, always in edit mode
Editor: Read-only access, can only comment, cannot publish

## Collaboration Panel
Displays: Active users, User roles (owner/editor) and Access mode (edit/read)


## How to Use the App
1.Sign up or log in
2.Create a new document
3.Use the editor to write content
4.Add sources via the search sidebar
5.Insert citations and organize references
6.Invite editors to collaborate
7.Review comments and finalize content
8.Publish to WordPress

## Testing

## TestingOverview

This application focuses on component-level validation and end-to-end system workflows rather than traditional unit testing. Because the platform is highly interactive (rich text editor, role-based permissions, embedded browsing, and collaboration), testing emphasizes user behavior, UI state changes, and multi-step processes.

## Component Testing
1. Authentication Component 
Test : Secure and Consistent User Access

User signs up with valid email/password : account created and stored in JSON
User logs in with correct credentials : redirected to dashboard
User logs in with incorrect credentials: access denied, error “Incorrect password” and “User not found”
Empty input fields: Error “Please fill in all fields”
Duplicate account creation: Error user already exists

2. Dashboard Component: Validate document organization and role separation
Test : Document appears in correct sections

User sees both a Writer and Editor section
The Writer section contains only documents a user owns
The Editor section contains only documents a user is added as an editor on
“+” button creates a new document


3. Document Editor Component
Tests: Ensure all writing and formatting tools function correctly.

Apply bold, italics, underline:  formatting reflected immediately
Switch between Normal, Heading 1, Heading 2
Alignment changes (left, center, right) update correctly
Bullet and numbered lists render properly
Editing controls : undo reverse last action and redo restores undone action
Media Insertion: an image is inserted to the document.

4. Citation & Sources Component
Test: Automatic citation generation and customization
Pasting a link auto-generates a citation
Citation appears in the Sources section
User can edit citation fields
Switching source type updates available fields dynamically.
You can switch types after editing

5.Integrated Browser Component
Test: Ensure correct handling of internal vs external browsing.

Non-commercial link (e.g., Wikipedia) loads inside the app
Commercial link opens in a new browser tab

6. Collaboration Component
Test: Role based permissions and visibility

Writer has full edit access
Editor is restricted to read-only mode
Editor can add comments but cannot modify content
Publish button disabled for editors
The Collaboration panel displays all active users, roles and reflects access mode

7. Commenting System
Tests: Validate comment system

If a user adds a comment it appears in document
Comments can be resolved
Multiple comments can exist simultaneously
Comments can be resolved but still appear in review queue

8. Publishing Component
Test :Confirm correct publishing workflow

Writer clicks publish:  redirected to publish page
Editor clicks publish:  no action / disabled
Document content transfers correctly


## System Testing
## End-to-End Writer Workflow

User signs up or  logs in
Creates a document
Writes and formats content
Inserts images
Adds sources via search bar
Generates and edits citations
Invites an editor
Publishes document successfully

## Editor Collaboration Workflow
Editor receives access
Document can be seen in the user’s Editor’s section
Opens document
Views content in read-only mode
Adds comments
Editor cannot edit text or publish

## Multi-User Interaction Workflow
Writer and editor can access the same document at the same time
Both appear in collaboration panel
Writer edits content
Editor observes updates and comments




