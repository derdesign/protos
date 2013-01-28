
## views/__static

You can create routes in your application without actually creating them in Controllers. You can also place a file in the 
*app/views/__static* directory.

Let's say your application should handle the following URLs, which mostly contain static content:

    http://myapp.com/portfolio
    http://myapp.com/about

If you want to keep your routes clean, you don't need to add a simple route to handle these. Just create the following files:

    app/views/__static/portfolio.html
    app/views/__static/about.html
    
Each time you access the URLs above, these templates will be used.
