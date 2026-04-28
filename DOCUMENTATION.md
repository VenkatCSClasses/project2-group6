
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
