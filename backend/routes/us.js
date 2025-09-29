
import express from 'express';

const router = express.Router();

router.get('/about-us', (req,res)=>{
    const pageTitle = 'About us';
    const windowTitle = 'Viktor | AboutUs';
    res.render('about-us',{ windowTitle, pageTitle});
})

router.get('/privacy-policy', (req,res)=>{
    const pageTitle = 'Privacy';
    const windowTitle = 'Viktor | Privacy';
    res.render('privacy-policy',{ windowTitle, pageTitle});
})

export default router;






