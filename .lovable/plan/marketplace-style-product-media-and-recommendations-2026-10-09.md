# Marketplace-style product media and recommendations

## What will change

- Replace the single product photo with a swipeable gallery: large active media, compact thumbnails, position dots, and tap-to-play short video.
- Extend the admin product editor so staff can add, reorder, and remove multiple images plus one short product video.
- Add image attachments to customer reviews, with previews before posting and a lightbox-style viewer on published reviews.
- Add a related-products strip below the reviews, prioritizing active products from the same category and excluding the current item.

## Media performance

- Product and review images will be resized in the browser and encoded as WebP/JPEG before upload; gallery images will be lazy-loaded after the first item.
- Product video will be limited to 30 seconds, compressed to a mobile-friendly 720p format when the browser supports recording, and rejected with a clear size message if it cannot be made lightweight.
- Store media in private Cloud storage and load only signed links for signed-in shoppers. Product media and review media receive separate access rules.

## Data and permissions

- Add ordered product-media records for image/video gallery items and review-media records owned by the reviewer.
- Staff can manage product media. Signed-in shoppers can read product media, upload review images only to their own folder, and manage only media attached to their own review.
- Preserve the existing main product photo as the first gallery item so current products continue to look correct without re-uploading anything.

## Verification

- Test image compression limits and gallery ordering as pure helper behavior.
- Verify on a phone-sized viewport: swiping/selecting media, video playback, posting a review with images, opening review photos, and adding a recommended product to the cart.
- Verify the admin can upload multiple images and a short video, then see the same ordered gallery on the customer product page.
