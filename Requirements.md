E-Commerce Mobile Application 

Application overview
The Application aims to create a basic e-commerce mobile application with the following core features:

User Registration/Login:
Authentication with OTP or email-based login.

Product Browsing and Filtering:
View and search products using filters like category and price.

Shopping Cart:
Add, remove, and view items in the cart.

Order Placement:
Mock payment gateway integration for placing orders.

Notifications:
Push notifications and email notifications for order confirmation.

Vendor Profiles and Listings:
Display vendor details and their product listings.

Chat Support:
Basic customer service using OpenAI's ChatGPT API.

Coupons during Checkout:
Display coupon details and listings.


Tech Stack

Frontend:
Framework: React Native (cross-platform for Android and iOS).
UI Libraries: Material-UI or NativeBase.

Backend:
Framework: Node.js (Express) or Python (Flask/Django).
Database: PostgreSQL for structured data (users, orders, products).

Third-Party Integrations:
Payment Gateway: Razorpay (mock setup for POC).
Notifications:
Firebase Cloud Messaging (Push Notifications).
SendGrid (Email Notifications).
Chat Support: OpenAI's ChatGPT API.
Hosting:
Cloud: AWS (EC2 for the server, S3 for storing product images).

Features Development Plan

1. User Authentication
Backend:
Setting up endpoints for user registration and login with OTP/email verification.
Frontend:
Creating login and signup screens with form validation and OTP/email handling.
2. Product Browsing and Filtering
Backend:
Developing an API to fetch product details and apply filters (e.g., by category, price).
Frontend:
Designing a product listing page with dynamic filters and sorting options.
3. Shopping Cart
Backend:
Building APIs to add, remove, and view cart items.
Frontend:
Implementing a shopping cart UI with "Add to Cart" and "View Cart" functionalities.
4. Order Placement
Backend:
Integrating Razorpay for mock payment processing.
Saving order details in the database.
Frontend:
Creating an order confirmation page displaying the order summary and payment status.



5. Notifications
Backend:
Integrating Firebase for push notifications.
Using SendGrid for sending order confirmation emails.
Frontend:
Showing push notifications for updates (e.g., "Your order has been placed").
6. Vendor Profiles and Listings
Backend:
Building an API to fetch and display vendor profiles and product listings.
Frontend:
Creating a vendor profile page displaying vendor details and associated products.
7. Chat Support
Backend:
Integrating OpenAI's ChatGPT API to handle basic customer queries.
Frontend:
Building a chat UI for real-time interaction.
8. Coupons during Checkout
Backend: 
Create an API to validate and apply coupons during checkout.
Frontend: 
Add a field on the checkout page for users to enter coupon codes.
Logic: 
Calculate the discount based on the coupon and update the total price.

Deliverables
Frontend:
Login/Signup screens.
Product listing with filtering functionality.
Shopping cart and order placement UI.
Vendor profile page and chat interface.
Backend:
APIs for:
User authentication.
Product management and filtering.
Shopping cart and order management.
Mock integrations:
Razorpay for payment processing.
OpenAI's ChatGPT API for customer support.
Deployment:
Deploying the backend on AWS EC2.
Using Firebase for push notification services.

Explanation of APIs
1. User Authentication APIs
POST /register: Register a new user with email/phone and password.
POST /login: Authenticate user with email/phone and password/OTP.
POST /send-otp: Send OTP to the user's phone/email for verification.
2. Product APIs
GET /products: Fetch a list of products with optional filters (category, price range).
GET /products/:id: Fetch detailed information for a single product.
3. Shopping Cart APIs
POST /cart: Add an item to the user's cart.
DELETE /cart/:itemId: Remove an item from the cart.
GET /cart: Retrieve the current items in the user's cart.
4. Order Placement APIs
POST /orders: Create a new order with items and payment details.
GET /orders/:id: Fetch details of a specific order.
5. Notification APIs
POST /notifications/push: Send a push notification to a user.
POST /notifications/email: Send an order confirmation email to a user.
6. Vendor APIs
GET /vendors: Fetch a list of vendors.
GET /vendors/:id: Retrieve details of a specific vendor.
7. Chat Support APIs
POST /chat: Send a user query to OpenAI's ChatGPT API and retrieve a response.

8. Coupons during Checkout
POST//coupons/validate: Checks if a coupon code is valid before applying it.


How the POC Works
User Journey:


Users can register or log in using email/OTP.
Browse products and filter them based on preferences.
Add items to the cart and proceed to checkout.
Place an order using the mock Razorpay payment gateway.
Receive notifications (push and email) for order confirmation.
Vendor Interaction:


Users can view vendor profiles and their product listings.
Customer Support:


Users can access chat support for queries, powered by OpenAI's ChatGPT API.
Backend Functionality:


APIs handle all user interactions, product management, and order processing.
Push notifications and emails keep users informed at each step.
Frontend Integration:


A React Native app provides a seamless user experience with responsive UI.
Testing Instructions
1. User Authentication
Using Postman to test the following APIs:
POST /register: Provide a valid email/phone and password.
POST /login: Test with correct and incorrect credentials to verify behavior.
POST /send-otp: Ensure OTP is sent to the provided email/phone.
On the frontend, check the registration and login flows for validation errors.
2. Product Browsing and Filtering
Testing GET /products API with various filter parameters (e.g., category, price range).
Verifying the frontend displays filtered results correctly.
3. Shopping Cart
Use APIs:
POST /cart: Add items and confirm the cart updates correctly.
DELETE /cart/:itemId: Remove items and ensure the cart reflects changes.
GET /cart: Retrieve current cart state.
Test adding/removing items through the app's UI.

4. Order Placement
Mock payment gateway API responses and test POST /orders.
Check the database for accurate order details after placement.
Confirm the frontend displays the order confirmation page correctly.
5. Notifications
Test push notifications by simulating events (e.g., order placement).
Verify email notifications are sent correctly using SendGrid logs.
6. Vendor Profiles and Listings
Test GET /vendors and GET /vendors/:id for accurate data retrieval.
Check the frontend for proper vendor profile displays.
7. Chat Support
Test POST /chat by sending sample queries to ChatGPT API.
Verify the chat interface handles responses correctly and maintains conversation flow.
8. Coupons during Checkout
Test POST//coupons/validate before applying it.
Check the frontend for a proper checkout page for users to enter coupon codes.

